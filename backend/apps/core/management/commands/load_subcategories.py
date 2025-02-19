import csv
from django.core.management.base import BaseCommand
from apps.core.models import Subcategory, CategoryQuestion
import os

class Command(BaseCommand):
    help = 'Carrega subcategorias no banco de dados'
    
    def handle(self, *args, **kwargs):
        file_path = os.path.join(os.path.dirname(__file__), 'subcategories.csv')

        try:
            # Fetch the CategoryQuestion object with a fixed id of 1
            category = CategoryQuestion.objects.get(id=1)
        except CategoryQuestion.DoesNotExist:
            self.stdout.write(self.style.ERROR("Category with id 1 does not exist."))
            return

        with open(file_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)

            for row in reader:
                try:
                    # Always use the fixed category object
                    subcategory_name = row['subcategory_name'].strip()

                    # Create the Subcategory object with the fixed category
                    Subcategory.objects.create(name=subcategory_name, category=category)

                except KeyError as e:
                    self.stdout.write(self.style.ERROR(f"Missing expected column: {e}"))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"An error occurred: {e}"))

        self.stdout.write(self.style.SUCCESS('Subcategorias carregadas com sucesso!'))
