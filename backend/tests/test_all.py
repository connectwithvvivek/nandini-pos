from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from customers.models import Customer
from products.models import Product, Category
from shifts.models import Shift
from pricing.models import CustomerProductPrice


def create_owner():
    return User.objects.create_user(username='owner', password='pass', full_name='Owner', role='OWNER')

def create_employee():
    return User.objects.create_user(username='emp', password='pass', full_name='Employee', role='EMPLOYEE')

def create_shift():
    return Shift.objects.create(name='Shift 1', start_time='06:00', end_time='12:00')

def create_category():
    return Category.objects.create(name='Milk')

def create_product(category, price=27.00, stock=100):
    return Product.objects.create(
        name='Nandini Milk', pack_size='500ml', default_price=price,
        stock_quantity=stock, minimum_stock=10, category=category
    )

def create_customer():
    return Customer.objects.create(name='Hotel ABC', phone='9876543210', customer_type='HOTEL')


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = create_owner()
        self.employee = create_employee()

    def test_owner_login(self):
        r = self.client.post('/api/auth/login/', {'username': 'owner', 'password': 'pass'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('access', r.data)
        self.assertEqual(r.data['user']['role'], 'OWNER')

    def test_employee_login(self):
        r = self.client.post('/api/auth/login/', {'username': 'emp', 'password': 'pass'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['user']['role'], 'EMPLOYEE')

    def test_invalid_login(self):
        r = self.client.post('/api/auth/login/', {'username': 'owner', 'password': 'wrong'})
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


class AuthorizationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = create_owner()
        self.employee = create_employee()
        self.category = create_category()
        self.product = create_product(self.category)
        self.customer = create_customer()

    def _auth(self, user):
        r = self.client.post('/api/auth/login/', {'username': user.username, 'password': 'pass'})
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {r.data["access"]}')

    def test_employee_cannot_change_product_price(self):
        self._auth(self.employee)
        r = self.client.patch(f'/api/products/{self.product.id}/', {'default_price': '99.00'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_cannot_change_customer_price(self):
        self._auth(self.employee)
        r = self.client.patch(f'/api/pricing/customers/{self.customer.id}/prices/', {
            'product': self.product.id, 'price': '20.00'
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_cannot_adjust_stock(self):
        self._auth(self.employee)
        r = self.client.post('/api/inventory/adjust/', {
            'product': self.product.id, 'transaction_type': 'PURCHASE', 'quantity': 50
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_change_product_price(self):
        self._auth(self.owner)
        r = self.client.patch(f'/api/products/{self.product.id}/', {'default_price': '30.00'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_owner_can_adjust_stock(self):
        self._auth(self.owner)
        r = self.client.post('/api/inventory/adjust/', {
            'product': self.product.id, 'transaction_type': 'PURCHASE', 'quantity': 50
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)


class PricingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = create_owner()
        self.category = create_category()
        self.product = create_product(self.category, price=27.00)
        self.customer = create_customer()

    def _auth_owner(self):
        r = self.client.post('/api/auth/login/', {'username': 'owner', 'password': 'pass'})
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {r.data["access"]}')

    def test_default_price_used_when_no_custom_price(self):
        self._auth_owner()
        r = self.client.get(f'/api/pricing/customers/{self.customer.id}/products/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        product_data = next(p for p in r.data if p['id'] == self.product.id)
        self.assertEqual(float(product_data['effective_price']), 27.00)
        self.assertIsNone(product_data['customer_price'])

    def test_customer_price_overrides_default(self):
        CustomerProductPrice.objects.create(
            customer=self.customer, product=self.product, price=25.00, updated_by=self.owner
        )
        self._auth_owner()
        r = self.client.get(f'/api/pricing/customers/{self.customer.id}/products/')
        product_data = next(p for p in r.data if p['id'] == self.product.id)
        self.assertEqual(float(product_data['effective_price']), 25.00)
        self.assertEqual(float(product_data['customer_price']), 25.00)

    def test_owner_can_set_customer_price(self):
        self._auth_owner()
        r = self.client.patch(f'/api/pricing/customers/{self.customer.id}/prices/', {
            'product': self.product.id, 'price': '24.00'
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(float(r.data['price']), 24.00)


class SaleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = create_owner()
        self.employee = create_employee()
        self.category = create_category()
        self.product = create_product(self.category, price=27.00, stock=100)
        self.customer = create_customer()
        self.shift = create_shift()

    def _auth(self, user):
        r = self.client.post('/api/auth/login/', {'username': user.username, 'password': 'pass'})
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {r.data["access"]}')

    def _create_sale(self, qty=5, price=27.00):
        return self.client.post('/api/sales/create/', {
            'customer': self.customer.id,
            'shift': self.shift.id,
            'payment_method': 'CASH',
            'items': [{'product': self.product.id, 'quantity': qty, 'unit_price': price}]
        }, format='json')

    def test_sale_creates_bill(self):
        self._auth(self.employee)
        r = self._create_sale(qty=5, price=27.00)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIn('INV-', r.data['bill_number'])
        self.assertEqual(float(r.data['total']), 135.00)

    def test_sale_reduces_stock(self):
        self._auth(self.employee)
        self._create_sale(qty=10, price=27.00)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 90)

    def test_insufficient_stock_rejected(self):
        self._auth(self.employee)
        r = self._create_sale(qty=200, price=27.00)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_historical_price_preserved(self):
        self._auth(self.employee)
        r = self._create_sale(qty=2, price=25.00)
        sale_id = r.data['id']
        # Change product price
        self.product.default_price = 30.00
        self.product.save()
        # Fetch bill - should still show 25.00
        r2 = self.client.get(f'/api/sales/{sale_id}/')
        self.assertEqual(float(r2.data['items'][0]['unit_price']), 25.00)

    def test_correct_customer_on_bill(self):
        self._auth(self.employee)
        r = self._create_sale()
        self.assertEqual(r.data['customer'], self.customer.id)
        self.assertEqual(r.data['customer_name'], self.customer.name)

    def test_correct_employee_on_bill(self):
        self._auth(self.employee)
        r = self._create_sale()
        self.assertEqual(r.data['employee'], self.employee.id)


class CustomerTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = create_owner()

    def _auth_owner(self):
        r = self.client.post('/api/auth/login/', {'username': 'owner', 'password': 'pass'})
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {r.data["access"]}')

    def test_unique_customer_code(self):
        self._auth_owner()
        r1 = self.client.post('/api/customers/', {'name': 'A', 'phone': '111', 'customer_type': 'REGULAR'}, format='json')
        r2 = self.client.post('/api/customers/', {'name': 'B', 'phone': '222', 'customer_type': 'REGULAR'}, format='json')
        self.assertNotEqual(r1.data['customer_code'], r2.data['customer_code'])

    def test_customer_search_by_name(self):
        Customer.objects.create(name='Hotel ABC', phone='9001', customer_type='HOTEL')
        Customer.objects.create(name='Ramesh', phone='9002', customer_type='REGULAR')
        self._auth_owner()
        r = self.client.get('/api/customers/?search=Hotel')
        self.assertEqual(len(r.data['results']), 1)
        self.assertEqual(r.data['results'][0]['name'], 'Hotel ABC')

    def test_customer_search_by_phone(self):
        Customer.objects.create(name='Test', phone='9876543210', customer_type='REGULAR')
        self._auth_owner()
        r = self.client.get('/api/customers/?search=9876543210')
        self.assertEqual(len(r.data['results']), 1)


class ProductImageUploadTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = create_owner()
        self.category = create_category()
        self.product = create_product(self.category)

    def _auth_owner(self):
        r = self.client.post('/api/auth/login/', {'username': 'owner', 'password': 'pass'})
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {r.data["access"]}')

    def test_product_image_upload_fallback(self):
        self._auth_owner()
        from django.core.files.uploadedfile import SimpleUploadedFile
        test_image = SimpleUploadedFile(
            name='test_milk.png',
            content=b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82',
            content_type='image/png'
        )
        r = self.client.post(f'/api/products/{self.product.id}/upload-image/', {'image': test_image}, format='multipart')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('image_url', r.data)
        self.product.refresh_from_db()
        self.assertTrue(bool(self.product.image_url))
