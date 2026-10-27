from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User
from customers.models import Customer
from products.models import Product, Category
from shifts.models import Shift
from pricing.models import CustomerProductPrice


class Command(BaseCommand):
    help = 'Seed the database with initial data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding database...')

        # Shifts
        shift1, _ = Shift.objects.get_or_create(name='Shift 1 - Morning', defaults={'start_time': '06:00', 'end_time': '12:00'})
        shift2, _ = Shift.objects.get_or_create(name='Shift 2 - Afternoon', defaults={'start_time': '12:00', 'end_time': '18:00'})
        shift3, _ = Shift.objects.get_or_create(name='Shift 3 - Evening', defaults={'start_time': '18:00', 'end_time': '23:00'})
        self.stdout.write('  [OK] Shifts created')

        # Owner
        if not User.objects.filter(username='owner').exists():
            User.objects.create_user(
                username='owner',
                password='owner@123',
                full_name='Nandini Owner',
                phone='9000000000',
                role='OWNER',
                is_staff=True,
            )
        self.stdout.write('  [OK] Owner created (username: owner, password: owner@123)')

        # Employees
        emp_data = [
            ('ravi', 'Ravi Kumar', '9111111111'),
            ('priya', 'Priya Sharma', '9222222222'),
            ('suresh', 'Suresh Nayak', '9333333333'),
        ]
        employees = []
        for username, full_name, phone in emp_data:
            emp, created = User.objects.get_or_create(
                username=username,
                defaults={'full_name': full_name, 'phone': phone, 'role': 'EMPLOYEE'}
            )
            if created:
                emp.set_password('emp@123')
                emp.save()
            employees.append(emp)
        self.stdout.write('  [OK] Employees created (password: emp@123)')

        # Categories
        cat_milk, _ = Category.objects.get_or_create(name='Milk & UHT Milk')
        cat_curd, _ = Category.objects.get_or_create(name='Curd & Dairy')
        cat_butter, _ = Category.objects.get_or_create(name='Butter & Ghee')
        cat_sweets, _ = Category.objects.get_or_create(name='Sweets & Treats')
        self.stdout.write('  [OK] Categories created')

        # Products
        products_data = [
            ('Nandini Toned Milk', cat_milk, '250 ml', 12.00, 100, 20, 'pcs'),
            ('Nandini Toned Milk', cat_milk, '500 ml', 24.00, 150, 30, 'pcs'),
            ('Nandini Toned Milk', cat_milk, '1 L', 48.00, 100, 20, 'pcs'),
            ('Nandini Shubham Standardised Milk', cat_milk, '250 ml', 14.00, 80, 15, 'pcs'),
            ('Nandini Shubham Standardised Milk', cat_milk, '500 ml', 27.00, 120, 20, 'pcs'),
            ('Nandini Shubham Standardised Milk', cat_milk, '1 L', 54.00, 75, 15, 'pcs'),
            ('Nandini Special Toned Milk', cat_milk, '500 ml', 26.00, 60, 10, 'pcs'),
            ('Nandini GoodLife Toned Milk', cat_milk, '1 L Tetra Pak', 64.00, 80, 15, 'pcs'),
            ('Nandini GoodLife Toned UHT Milk', cat_milk, '500 ml', 32.00, 60, 10, 'pcs'),
            ('Nandini Thick Curd', cat_curd, '200 g / 250 ml', 14.00, 80, 15, 'pcs'),
            ('Nandini Thick Curd', cat_curd, '450 g / 500 ml', 28.00, 100, 20, 'pcs'),
            ('Nandini Thick Curd', cat_curd, '1 kg / 1 L', 55.00, 50, 10, 'pcs'),
            ('Nandini Spiced Buttermilk', cat_curd, '200 ml', 10.00, 90, 15, 'pcs'),
            ('Nandini Pasteurised Butter - Unsalted', cat_butter, '200 g', 140.00, 40, 5, 'pcs'),
            ('Nandini Salted Pasteurised Butter', cat_butter, '500 g', 198.00, 30, 5, 'pcs'),
            ('Nandini Butter', cat_butter, 'General/Local Retail', 350.00, 20, 3, 'pcs'),
            ('Milk Peda', cat_sweets, '100 g', 60.00, 30, 5, 'pcs'),
            ('Milk Peda', cat_sweets, '250 g', 140.00, 20, 5, 'pcs'),
            ('Mysore Pak', cat_sweets, '100 g', 60.00, 25, 5, 'pcs'),
            ('Mysore Pak', cat_sweets, '250 g', 160.00, 20, 5, 'pcs'),
            ('Mysore Pak', cat_sweets, '500 g', 280.00, 15, 3, 'pcs'),
            ('Belgaum Kunda', cat_sweets, 'Pack', 125.00, 20, 3, 'pcs'),
            ('Karadant', cat_sweets, 'Pack', 185.00, 15, 3, 'pcs'),
            ('Millet Laddu', cat_sweets, 'Pack', 105.00, 20, 3, 'pcs'),
        ]

        created_products = {}
        for name, category, pack_size, price, stock, min_stock, unit in products_data:
            key = f"{name}_{pack_size}"
            product, _ = Product.objects.get_or_create(
                name=name,
                pack_size=pack_size,
                defaults={
                    'category': category,
                    'default_price': price,
                    'stock_quantity': stock,
                    'minimum_stock': min_stock,
                    'unit': unit,
                }
            )
            created_products[key] = product
        self.stdout.write('  [OK] Products created')

        # Customers
        customers_data = [
            ('Hotel ABC', '9876543210', 'MG Road, Bangalore', 'HOTEL'),
            ('Restaurant XYZ', '9876543211', 'Brigade Road, Bangalore', 'RESTAURANT'),
            ('Ramesh', '9876543212', 'Jayanagar, Bangalore', 'REGULAR'),
            ('Lakshmi Bakery', '9876543213', 'Koramangala, Bangalore', 'RETAILER'),
        ]
        created_customers = []
        for name, phone, address, ctype in customers_data:
            cust, _ = Customer.objects.get_or_create(
                phone=phone,
                defaults={'name': name, 'address': address, 'customer_type': ctype}
            )
            created_customers.append(cust)
        self.stdout.write('  [OK] Customers created')

        # Customer-specific prices
        milk_500 = created_products.get('Nandini Shubham Standardised Milk_500 ml')
        curd_500 = created_products.get('Nandini Thick Curd_500 g')
        butter_200 = created_products.get('Nandini Pasteurised Butter - Unsalted_200 g')
        owner = User.objects.get(username='owner')

        if milk_500 and len(created_customers) >= 3:
            price_data = [
                (created_customers[0], milk_500, 25.00),   # Hotel ABC
                (created_customers[1], milk_500, 26.00),   # Restaurant XYZ
                (created_customers[2], milk_500, 27.00),   # Ramesh
                (created_customers[3], milk_500, 25.50),   # Lakshmi Bakery
            ]
            if curd_500:
                price_data += [
                    (created_customers[0], curd_500, 26.00),
                    (created_customers[1], curd_500, 27.00),
                ]
            if butter_200:
                price_data += [
                    (created_customers[0], butter_200, 135.00),
                ]

            for customer, product, price in price_data:
                CustomerProductPrice.objects.get_or_create(
                    customer=customer,
                    product=product,
                    defaults={'price': price, 'updated_by': owner}
                )
        self.stdout.write('  [OK] Customer-specific prices created')

        self.stdout.write(self.style.SUCCESS('\nDatabase seeded successfully!'))
        self.stdout.write('\nLogin credentials:')
        self.stdout.write('  Owner:    username=owner    password=owner@123')
        self.stdout.write('  Employee: username=ravi     password=emp@123')
        self.stdout.write('  Employee: username=priya    password=emp@123')
        self.stdout.write('  Employee: username=suresh   password=emp@123')
