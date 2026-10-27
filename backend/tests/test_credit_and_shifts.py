from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from accounts.models import User
from customers.models import Customer
from products.models import Product, Category
from shifts.models import Shift, EmployeeShift
from sales.models import Sale, CreditBill, CreditPayment


class CreditAndShiftTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username='owner_user', password='pass', role='OWNER', full_name='Owner User'
        )
        self.employee = User.objects.create_user(
            username='emp_user', password='pass', role='EMPLOYEE', full_name='Emp User'
        )
        self.category = Category.objects.create(name='Milk')
        self.product = Product.objects.create(
            name='Nandini Toned Milk', pack_size='500 ml', default_price=Decimal('24.00'),
            stock_quantity=Decimal('100.00'), minimum_stock=Decimal('10.00'), category=self.category
        )
        self.customer = Customer.objects.create(
            name='Ramesh Dairy Bar', phone='9876543210', customer_type='REGULAR'
        )
        self.shift = Shift.objects.create(
            name='Morning', start_time='06:00:00', end_time='14:00:00'
        )

    def _auth(self, user):
        r = self.client.post('/api/auth/login/', {'username': user.username, 'password': 'pass'})
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {r.data["access"]}')

    def test_cash_sale_has_no_credit(self):
        self._auth(self.employee)
        r = self.client.post('/api/sales/create/', {
            'customer': self.customer.id,
            'shift': self.shift.id,
            'payment_method': 'CASH',
            'items': [{'product': self.product.id, 'quantity': 5, 'unit_price': '24.00'}]
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['payment_method'], 'CASH')
        self.assertEqual(CreditBill.objects.count(), 0)

    def test_online_sale_has_no_credit(self):
        self._auth(self.employee)
        r = self.client.post('/api/sales/create/', {
            'customer': self.customer.id,
            'shift': self.shift.id,
            'payment_method': 'ONLINE',
            'items': [{'product': self.product.id, 'quantity': 2, 'unit_price': '24.00'}]
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['payment_method'], 'ONLINE')
        self.assertEqual(CreditBill.objects.count(), 0)

    def test_card_payment_rejected(self):
        self._auth(self.employee)
        r = self.client.post('/api/sales/create/', {
            'customer': self.customer.id,
            'shift': self.shift.id,
            'payment_method': 'CARD',
            'items': [{'product': self.product.id, 'quantity': 2, 'unit_price': '24.00'}]
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_credit_sale_creates_receivable_and_reduces_stock(self):
        self._auth(self.employee)
        r = self.client.post('/api/sales/create/', {
            'customer': self.customer.id,
            'shift': self.shift.id,
            'payment_method': 'CREDIT',
            'items': [{'product': self.product.id, 'quantity': 10, 'unit_price': '24.00'}]
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        sale_id = r.data['id']
        total = Decimal(str(r.data['total']))
        self.assertEqual(total, Decimal('240.00'))

        # Stock reduced
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, Decimal('90.00'))

        # Credit bill created
        credit_bill = CreditBill.objects.get(sale_id=sale_id)
        self.assertEqual(credit_bill.customer_id, self.customer.id)
        self.assertEqual(credit_bill.employee_id, self.employee.id)
        self.assertEqual(credit_bill.original_amount, Decimal('240.00'))
        self.assertEqual(credit_bill.outstanding_amount, Decimal('240.00'))
        self.assertEqual(credit_bill.amount_paid, Decimal('0.00'))
        self.assertEqual(credit_bill.status, 'PENDING')

    def test_credit_partial_and_full_payment(self):
        self._auth(self.employee)
        # 1. Create Credit Sale of ₹240
        r = self.client.post('/api/sales/create/', {
            'customer': self.customer.id,
            'shift': self.shift.id,
            'payment_method': 'CREDIT',
            'items': [{'product': self.product.id, 'quantity': 10, 'unit_price': '24.00'}]
        }, format='json')
        sale_id = r.data['id']
        credit_bill = CreditBill.objects.get(sale_id=sale_id)

        # 2. Partial payment of ₹100 Cash
        r_pay1 = self.client.post(f'/api/sales/credit/bills/{credit_bill.id}/pay/', {
            'amount': '100.00',
            'payment_method': 'CASH',
            'notes': 'First partial payment'
        }, format='json')
        self.assertEqual(r_pay1.status_code, status.HTTP_201_CREATED)

        credit_bill.refresh_from_db()
        self.assertEqual(credit_bill.amount_paid, Decimal('100.00'))
        self.assertEqual(credit_bill.outstanding_amount, Decimal('140.00'))
        self.assertEqual(credit_bill.status, 'PARTIALLY_PAID')

        # 3. Over-payment should be rejected
        r_overpay = self.client.post(f'/api/sales/credit/bills/{credit_bill.id}/pay/', {
            'amount': '200.00',
            'payment_method': 'ONLINE'
        }, format='json')
        self.assertEqual(r_overpay.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Final payment of ₹140 Online
        r_pay2 = self.client.post(f'/api/sales/credit/bills/{credit_bill.id}/pay/', {
            'amount': '140.00',
            'payment_method': 'ONLINE',
            'notes': 'Final settlement'
        }, format='json')
        self.assertEqual(r_pay2.status_code, status.HTTP_201_CREATED)

        credit_bill.refresh_from_db()
        self.assertEqual(credit_bill.amount_paid, Decimal('240.00'))
        self.assertEqual(credit_bill.outstanding_amount, Decimal('0.00'))
        self.assertEqual(credit_bill.status, 'PAID')
        self.assertIsNotNone(credit_bill.settled_at)

        # 5. Further payment rejected on PAID bill
        r_extra = self.client.post(f'/api/sales/credit/bills/{credit_bill.id}/pay/', {
            'amount': '10.00',
            'payment_method': 'CASH'
        }, format='json')
        self.assertEqual(r_extra.status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_credit_ledger(self):
        self._auth(self.employee)
        # Create credit sale
        self.client.post('/api/sales/create/', {
            'customer': self.customer.id,
            'shift': self.shift.id,
            'payment_method': 'CREDIT',
            'items': [{'product': self.product.id, 'quantity': 5, 'unit_price': '24.00'}]
        }, format='json')

        r = self.client.get(f'/api/sales/credit/customer/{self.customer.id}/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['total_credit'], 120.00)
        self.assertEqual(r.data['outstanding_amount'], 120.00)
        self.assertEqual(r.data['pending_bills_count'], 1)
        self.assertEqual(len(r.data['bills']), 1)

    def test_shift_reconciliation_cash_calculation(self):
        self._auth(self.employee)
        today = timezone.localdate()
        # Open an employee shift with ₹500 opening cash
        emp_shift = EmployeeShift.objects.create(
            employee=self.employee,
            shift=self.shift,
            date=today,
            opening_cash=Decimal('500.00'),
            status='OPEN'
        )

        # 1. Cash sale of ₹120 (5 * 24)
        self.client.post('/api/sales/create/', {
            'customer': self.customer.id,
            'shift': self.shift.id,
            'employee_shift': emp_shift.id,
            'payment_method': 'CASH',
            'items': [{'product': self.product.id, 'quantity': 5, 'unit_price': '24.00'}]
        }, format='json')

        # 2. Online sale of ₹72 (3 * 24) - not cash!
        self.client.post('/api/sales/create/', {
            'customer': self.customer.id,
            'shift': self.shift.id,
            'employee_shift': emp_shift.id,
            'payment_method': 'ONLINE',
            'items': [{'product': self.product.id, 'quantity': 3, 'unit_price': '24.00'}]
        }, format='json')

        # 3. Credit sale of ₹240 (10 * 24) - not cash!
        r_cred = self.client.post('/api/sales/create/', {
            'customer': self.customer.id,
            'shift': self.shift.id,
            'employee_shift': emp_shift.id,
            'payment_method': 'CREDIT',
            'items': [{'product': self.product.id, 'quantity': 10, 'unit_price': '24.00'}]
        }, format='json')
        cred_bill_id = CreditBill.objects.get(sale_id=r_cred.data['id']).id

        # 4. Customer pays ₹100 cash toward the credit bill in this shift
        self.client.post(f'/api/sales/credit/bills/{cred_bill_id}/pay/', {
            'amount': '100.00',
            'payment_method': 'CASH',
            'employee_shift': emp_shift.id
        }, format='json')

        # Check shift summary
        r_shift = self.client.get('/api/shifts/current/')
        self.assertEqual(r_shift.status_code, status.HTTP_200_OK)
        # Expected Cash = 500 (opening) + 120 (cash sale) + 100 (cash credit collected) = 720
        self.assertEqual(r_shift.data['expected_cash'], 720.00)
        self.assertEqual(r_shift.data['cash_sales'], 120.00)
        self.assertEqual(r_shift.data['online_sales'], 72.00)
        self.assertEqual(r_shift.data['credit_sales'], 240.00)
        self.assertEqual(r_shift.data['cash_credit_collected'], 100.00)

