from django.db import models
from apps.core.models import Company  # Importa o modelo Company para a chave estrangeira

class Rem(models.Model):
    periodo = models.DateField()

    empregados = models.IntegerField(null=True, blank=True)
    horas_homem_exposicao = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    #acidentes tipicos
    fatalidades = models.IntegerField(null=True, blank=True)
    acidentes_com_afastamento_tipicos = models.IntegerField(null=True, blank=True)
    tratamento_medico = models.IntegerField(null=True, blank=True)
    trabalho_restrito = models.IntegerField(null=True, blank=True)
    primeiros_socorros = models.IntegerField(null=True, blank=True)
    dias_perdidos_debitados = models.IntegerField(null=True, blank=True)
    acidentados_registraveis = models.IntegerField(null=True, blank=True)


    #acidentes não tipicos
    acidentes_com_afastamento = models.IntegerField(null=True, blank=True)
    acidentes_sem_afastamento = models.IntegerField(null=True, blank=True)
    acidentes_transito = models.IntegerField(null=True, blank=True)
    outros = models.IntegerField(null=True, blank=True)


    #taxas
    total_incidentes_registraveis = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    taxa_com_afastamento = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    taxa_sem_afastamento = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    incidencia = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    gravidade = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    


    lma_nca = models.IntegerField(null=True, blank=True)
    lma_tfca = models.IntegerField(null=True, blank=True)
    
    
    
    
    
    

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='rems')

    class Meta:
        verbose_name = "REM"
        verbose_name_plural = "REMs"
        constraints = [
            models.UniqueConstraint(fields=['company', 'periodo'], name='unique_rem_per_company_periodo')
        ]

    def __str__(self):
        return f"REM - {self.company.name} ({self.periodo})"
