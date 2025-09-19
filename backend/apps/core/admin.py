#apps.core.admin.py
from django.contrib import admin
from django.contrib.auth.forms import UserChangeForm
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django import forms
from .models import (
    Subcategory, 
    CategoryQuestion,
    Company,
    Polo
)

admin.site.site_header = "SMS Administração"
admin.site.site_title = "SMS Administração"
admin.site.index_title = "Bem-vindo ao Admin"


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'cnpj', 'get_users', 'dominio')
    list_filter = ('is_active',)
    search_fields = ('name', 'cnpj', 'dominio')
    filter_horizontal = ('users',)  # Add horizontal filter for better UX with ManyToMany
    
    # Campos obrigatórios no formulário
    fields = ('name', 'cnpj', 'dominio', 'users', 'is_active')
    
    def get_users(self, obj):
        return ", ".join([user.username for user in obj.users.all()]) or "Nenhum usuário"
    get_users.short_description = "Usuários"
    

@admin.register(CategoryQuestion)
class CategoryQuestionAdmin(admin.ModelAdmin):
    list_display = ('name', 'weight')


@admin.register(Subcategory)
class SubcategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'category')


class CustomUserChangeForm(UserChangeForm):
    companies = forms.ModelMultipleChoiceField(
        queryset=Company.objects.all(),
        widget=admin.widgets.FilteredSelectMultiple('Empresas', False),
        required=False,
        help_text='Selecione as empresas que este usuário pode acessar.'
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            # Carrega as empresas atuais do usuário
            self.fields['companies'].initial = self.instance.companies.all()

    def clean_companies(self):
        return self.cleaned_data.get('companies', [])

    def save(self, commit=True):
        user = super().save(commit=False)
        
        if commit:
            user.save()
            # Força o salvamento das empresas
            if 'companies' in self.cleaned_data:
                user.companies.clear()  # Remove todas as associações existentes
                for company in self.cleaned_data['companies']:
                    user.companies.add(company)  # Adiciona uma por uma
            self.save_m2m()
        
        return user


class CompanyInline(admin.TabularInline):
    model = Company.users.through
    extra = 1
    verbose_name = "Empresa"
    verbose_name_plural = "Empresas"


# Custom UserAdmin to include companies
class UserAdmin(BaseUserAdmin):
    inlines = (CompanyInline,)
    
    def get_inline_instances(self, request, obj=None):
        if not obj:
            return []
        return super().get_inline_instances(request, obj)
    
    def save_model(self, request, obj, form, change):
        """Override save_model to ensure companies are saved properly"""
        super().save_model(request, obj, form, change)
        if change and hasattr(form, 'cleaned_data') and 'companies' in form.cleaned_data:
            # Garante que as empresas sejam salvas
            obj.companies.set(form.cleaned_data['companies'])


@admin.register(Polo)
class PoloAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("name", "description")
    filter_horizontal = ("companies", "users")


# Re-register UserAdmin para incluir a nova configuração
admin.site.unregister(User)
admin.site.register(User, UserAdmin)