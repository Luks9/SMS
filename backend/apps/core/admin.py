from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from .models import (
    Subcategory, 
    CategoryQuestion,
    Company
)

admin.site.site_header = "SMS Administração"
admin.site.site_title = "SMS Administração"
admin.site.index_title = "Bem-vindo ao Admin"

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'cnpj', 'user')
    

@admin.register(CategoryQuestion)
class CategoryQuestionAdmin(admin.ModelAdmin):
    list_display = ('name', 'weight')


@admin.register(Subcategory)
class SubcategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'category')
