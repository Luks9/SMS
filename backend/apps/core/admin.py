from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
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


# Inline para permitir a edição da empresa associada ao usuário
class CompanyInline(admin.StackedInline):
    model = Company
    can_delete = False
    verbose_name_plural = 'Empresa'
    fk_name = 'user'

# Custom UserAdmin que inclui a empresa
class UserAdmin(BaseUserAdmin):
    inlines = (CompanyInline,)  # Adiciona o inline da empresa ao UserAdmin

    def get_inline_instances(self, request, obj=None):
        if not obj:
            return []
        return super(UserAdmin, self).get_inline_instances(request, obj)

# Re-register UserAdmin para incluir a nova configuração
admin.site.unregister(User)
admin.site.register(User, UserAdmin)