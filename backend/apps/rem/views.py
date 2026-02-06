from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, OpenApiTypes
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED, HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND, HTTP_200_OK
from rest_framework.decorators import action
from django.db import transaction
from django.http import HttpResponse
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from datetime import datetime
import locale
from .models import Rem, DieselConsumido, FuncionariosDemitidos
from .serializers import RemSerializer, DieselConsumidoSerializer, FuncionariosDemitidosSerializer
from apps.core.models import Company
from apps.users.utils.permissions import user_has_access_to_company
from rest_framework.exceptions import ValidationError

@extend_schema(tags=['REM'])
class RemViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar os dados de REM.
    """
    queryset = Rem.objects.all()
    serializer_class = RemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filtra os dados de REM com base no usuário autenticado.
        """
        user = self.request.user
        if user.is_superuser:
            return Rem.objects.all()
        return Rem.objects.filter(company__user=user)

    def perform_create(self, serializer):
        """
        Define o comportamento ao criar um novo REM.
        """
        user = self.request.user
        company_id = self.request.data.get('company')
        if not company_id:
            raise ValidationError("O campo 'company' é obrigatório.")

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            raise ValidationError("Empresa não encontrada.")

        # Usa a função user_has_access_to_company para validar acesso
        access = user_has_access_to_company(user, company)
        if access is not True:
            return access  # Retorna Response 403 se não tiver permissão

        serializer.save(company=company)

    @extend_schema(
        description="Retorna os dados combinados de REM, Diesel Consumido e Funcionários Demitidos para todas as empresas.",
        responses={200: "Dados combinados retornados com sucesso."}
    )
    @action(detail=False, methods=['get'], url_path='combined-data')
    def combined_data_for_all_companies(self, request):
        """
        Endpoint para retornar todos os dados combinados de REM, Diesel Consumido e Funcionários Demitidos para todas as empresas.
        """
        # Obtém todos os dados de REM, Diesel Consumido e Funcionários Demitidos

        polo_id = self.request.headers.get('X-Polo-Id')
        rems = Rem.objects.filter(company__poles__id=polo_id).order_by('-periodo', '-id')
        diesel_consumidos = DieselConsumido.objects.filter(company__poles__id=polo_id)
        funcionarios_demitidos = FuncionariosDemitidos.objects.filter(company__poles__id=polo_id)
        # Combina os dados
        combined_data = []
        for rem in rems:
            # Buscando Diesel Consumido e Funcionários Demitidos com o mesmo periodo
            diesel = diesel_consumidos.filter(periodo=rem.periodo, company=rem.company).first()
            demitidos = funcionarios_demitidos.filter(periodo=rem.periodo, company=rem.company).first()

            combined_data.append({
                "rem": RemSerializer(rem).data,
                "consumo_diesel": DieselConsumidoSerializer(diesel).data if diesel else None,
                "funcionarios_demitidos": FuncionariosDemitidosSerializer(demitidos).data if demitidos else None,
            })
        return Response(combined_data, status=HTTP_200_OK)

    @extend_schema(
        description="Cria um REM e distribui os dados adicionais para as tabelas DieselConsumido e FuncionariosDemitidos.",
        responses={201: "REM e dados adicionais criados com sucesso.", 400: "Erro de validação."}
    )
    @action(detail=False, methods=['post'], url_path='create-with-extras')
    def create_with_extras(self, request):
        """
        Endpoint para criar um REM e distribuir os dados adicionais para as tabelas DieselConsumido e FuncionariosDemitidos.
        """
        user = request.user
        data = request.data

        # Validações básicas
        company_id = data.get('company')
        periodo = data.get('periodo')
        if not company_id:
            return Response({"detail": "O campo 'company' é obrigatório."}, status=HTTP_400_BAD_REQUEST)
        if not periodo:
            return Response({"detail": "O campo 'periodo' é obrigatório."}, status=HTTP_400_BAD_REQUEST)

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({"detail": "Empresa não encontrada."}, status=HTTP_400_BAD_REQUEST)

        # Verifica permissão de acesso à empresa
        access = user_has_access_to_company(user, company)
        if access is not True:
            return access

        # Verifica se já existe um registro para o mesmo período e empresa
        if Rem.objects.filter(company=company, periodo=periodo).exists():
            return Response({"detail": "Já existe um registro de REM para este período e empresa."}, status=HTTP_400_BAD_REQUEST)
        if DieselConsumido.objects.filter(company=company, periodo=periodo).exists():
            return Response({"detail": "Já existe um registro de Diesel Consumido para este período e empresa."}, status=HTTP_400_BAD_REQUEST)
        if FuncionariosDemitidos.objects.filter(company=company, periodo=periodo).exists():
            return Response({"detail": "Já existe um registro de Funcionários Demitidos para este período e empresa."}, status=HTTP_400_BAD_REQUEST)

        # Criação do REM
        rem_serializer = RemSerializer(data=data, context={'request': request})
        if rem_serializer.is_valid():
            rem = rem_serializer.save(company=company)
        else:
            return Response(rem_serializer.errors, status=HTTP_400_BAD_REQUEST)

        # Criação do DieselConsumido
        diesel_data = {
            "periodo": periodo,
            "diesel_consumido": data.get('diesel_consumido', 0),
            "company": company.id
        }
        diesel_serializer = DieselConsumidoSerializer(data=diesel_data, context={'request': request})
        if diesel_serializer.is_valid():
            diesel_serializer.save(company=company)
        else:
            return Response(diesel_serializer.errors, status=HTTP_400_BAD_REQUEST)

        # Criação do FuncionariosDemitidos
        demitidos_data = {
            "periodo": periodo,
            "funcionarios_demitidos": data.get('funcionarios_demitidos', 0),
            "company": company.id
        }
        demitidos_serializer = FuncionariosDemitidosSerializer(data=demitidos_data, context={'request': request})
        if demitidos_serializer.is_valid():
            demitidos_serializer.save(company=company)
        else:
            return Response(demitidos_serializer.errors, status=HTTP_400_BAD_REQUEST)

        return Response({"detail": "REM e dados adicionais criados com sucesso."}, status=HTTP_201_CREATED)
    
    @extend_schema(
        description="Atualiza um REM existente e seus dados adicionais nas tabelas DieselConsumido e FuncionariosDemitidos.",
        responses={200: "REM e dados adicionais atualizados com sucesso.", 400: "Erro de validação.", 404: "REM não encontrado."}
    )
    @action(detail=True, methods=['patch'], url_path='update-with-extras')
    def update_with_extras(self, request, pk=None):
        """
        Endpoint para atualizar um REM e seus dados adicionais.
        """
        user = request.user
        data = request.data

        try:
            rem = Rem.objects.get(pk=pk)
        except Rem.DoesNotExist:
            return Response({"detail": "REM não encontrado."}, status=HTTP_404_NOT_FOUND)

        company_id = data.get('company', rem.company.id)
        periodo = data.get('periodo', rem.periodo)

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({"detail": "Empresa não encontrada."}, status=HTTP_400_BAD_REQUEST)

        access = user_has_access_to_company(user, company)
        if access is not True:
            return access

    
        with transaction.atomic():
            # Atualiza REM
            rem_serializer = RemSerializer(rem, data=data, partial=True, context={'request': request})
            if rem_serializer.is_valid():
                rem_serializer.save()
            else:
                return Response(rem_serializer.errors, status=HTTP_400_BAD_REQUEST)

            # Atualiza DieselConsumido
            try:
                diesel = DieselConsumido.objects.get(company=company, periodo=periodo)
                diesel_data = {
                    "periodo": periodo,
                    "diesel_consumido": data.get('diesel_consumido', diesel.diesel_consumido),
                    "company": company.id
                }
                diesel_serializer = DieselConsumidoSerializer(diesel, data=diesel_data, partial=True, context={'request': request})
                if diesel_serializer.is_valid():
                    diesel_serializer.save()
                else:
                    return Response(diesel_serializer.errors, status=HTTP_400_BAD_REQUEST)
            except DieselConsumido.DoesNotExist:
                return Response({"detail": "Registro de Diesel Consumido não encontrado."}, status=HTTP_404_NOT_FOUND)

            # Atualiza FuncionariosDemitidos
            try:
                demitidos = FuncionariosDemitidos.objects.get(company=company, periodo=periodo)
                demitidos_data = {
                    "periodo": periodo,
                    "funcionarios_demitidos": data.get('funcionarios_demitidos', demitidos.funcionarios_demitidos),
                    "company": company.id
                }
                demitidos_serializer = FuncionariosDemitidosSerializer(demitidos, data=demitidos_data, partial=True, context={'request': request})
                if demitidos_serializer.is_valid():
                    demitidos_serializer.save()
                else:
                    return Response(demitidos_serializer.errors, status=HTTP_400_BAD_REQUEST)
            except FuncionariosDemitidos.DoesNotExist:
                return Response({"detail": "Registro de Funcionários Demitidos não encontrado."}, status=HTTP_404_NOT_FOUND)

        return Response({"detail": "REM e dados adicionais atualizados com sucesso."}, status=HTTP_200_OK)

    @extend_schema(
        description="Retorna os dados combinados de REM, Diesel Consumido e Funcionários Demitidos para uma empresa.",
        responses={200: "Dados combinados retornados com sucesso.", 404: "Empresa não encontrada."}
    )
    @action(detail=False, methods=['get'], url_path='combined-data/(?P<company_id>[^/.]+)')
    def combined_data_for_company(self, request, company_id=None):
        """
        Endpoint para retornar os dados combinados de REM, Diesel Consumido e Funcionários Demitidos para uma empresa.
        """
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({"detail": "Empresa não encontrada."}, status=HTTP_404_NOT_FOUND)

        # Verifica permissão de acesso à empresa
        access = user_has_access_to_company(request.user, company)
        if access is not True:
            return access

        # Obtém os dados de REM, Diesel Consumido e Funcionários Demitidos
        rems = Rem.objects.filter(company=company).order_by('-periodo')
        diesel_consumidos = DieselConsumido.objects.filter(company=company)
        funcionarios_demitidos = FuncionariosDemitidos.objects.filter(company=company)

        # Combina os dados
        combined_data = []
        for rem in rems:
            diesel = diesel_consumidos.filter(periodo=rem.periodo).first()
            demitidos = funcionarios_demitidos.filter(periodo=rem.periodo).first()

            combined_data.append({
                "rem": RemSerializer(rem).data,
                "consumo_diesel": DieselConsumidoSerializer(diesel).data if diesel else None,
                "funcionarios_demitidos": FuncionariosDemitidosSerializer(demitidos).data if demitidos else None,
            })
        return Response(combined_data, status=HTTP_200_OK)

    @extend_schema(
        tags=['REM'],
        description="Exporta os dados de REM em formato PDF para uma empresa e período específico.",
        parameters=[
            OpenApiParameter(name='company_id', description='ID da empresa', required=True, type=int, location=OpenApiParameter.QUERY),
            OpenApiParameter(name='periodo', description='Período no formato YYYY-MM-DD', required=True, type=str, location=OpenApiParameter.QUERY),
        ],
        responses={200: OpenApiResponse(response=OpenApiTypes.BINARY, description="Documento PDF"), 404: "REM não encontrado"}
    )
    @action(detail=False, methods=['get'], url_path='export/pdf')
    def export_pdf(self, request):
        """
        Endpoint para exportar dados de REM em PDF com design profissional
        """
        company_id = request.query_params.get('company_id')
        periodo = request.query_params.get('periodo')

        if not company_id or not periodo:
            return Response({"detail": "company_id e periodo são obrigatórios."}, status=HTTP_400_BAD_REQUEST)

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({"detail": "Empresa não encontrada."}, status=HTTP_404_NOT_FOUND)

        # Verifica permissão
        access = user_has_access_to_company(request.user, company)
        if access is not True:
            return access

        # Busca os dados
        try:
            rem = Rem.objects.get(company=company, periodo=periodo)
        except Rem.DoesNotExist:
            return Response({"detail": "Dados REM não encontrados para este período."}, status=HTTP_404_NOT_FOUND)

        diesel = DieselConsumido.objects.filter(company=company, periodo=periodo).first()
        demitidos = FuncionariosDemitidos.objects.filter(company=company, periodo=periodo).first()

        # Gera o PDF
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        
        # Cores da aplicação
        primary_color = colors.HexColor('#1f64a9')
        dark_blue = colors.HexColor('#012140')
        success_color = colors.HexColor('#48bb78')
        warning_color = colors.HexColor('#f6e05e')
        danger_color = colors.HexColor('#ef4444')
        light_gray = colors.HexColor('#f8fafc')
        medium_gray = colors.HexColor('#e4e7eb')
        
        periodo_date = datetime.strptime(periodo, '%Y-%m-%d')
        
        # Meses em português
        meses_pt = {
            1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
            5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
            9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
        }
        periodo_formatado = f"{meses_pt[periodo_date.month]}/{periodo_date.year}"
        
        # Cabeçalho com fundo azul
        p.setFillColor(primary_color)
        p.rect(0, height - 2.4*cm, width, 2.4*cm, fill=True, stroke=False)
        
        p.setFillColor(colors.white)
        p.setFont("Helvetica-Bold", 18)
        p.drawString(2*cm, height - 1.2*cm, "RELATÓRIO REM")
        p.setFont("Helvetica", 11)
        p.drawString(2*cm, height - 1.7*cm, "Registro de Estatísticas de Acidentes")
        
        # Informações da empresa
        p.setFillColor(dark_blue)
        p.rect(0, height - 4.1*cm, width, 1.7*cm, fill=True, stroke=False)
        
        p.setFillColor(colors.white)
        p.setFont("Helvetica-Bold", 13)
        p.drawString(2*cm, height - 3.0*cm, f"Empresa: {company.name}")
        p.setFont("Helvetica", 10)
        p.drawString(2*cm, height - 3.5*cm, f"Período: {periodo_formatado}")
        
        y_position = height - 4.8*cm
        
        def format_value(value, decimals=0):
            if value is None:
                return "-"
            if decimals > 0:
                return f"{float(value):.{decimals}f}"
            return str(int(value))
        
        def draw_section_header(title, y_pos, color=primary_color):
            """Desenha um cabeçalho de seção e retorna a nova posição Y"""
            # Desenha o retângulo do cabeçalho
            header_height = 0.6*cm
            p.setFillColor(color)
            p.rect(1.5*cm, y_pos - header_height, width - 3*cm, header_height, fill=True, stroke=False)
            
            # Desenha o texto do cabeçalho
            p.setFillColor(colors.white)
            p.setFont("Helvetica-Bold", 11)
            p.drawString(2*cm, y_pos - header_height + 0.15*cm, title)
            
            # Retorna posição abaixo do cabeçalho
            return y_pos - header_height - 0.2*cm
        
        def create_data_table(data_rows, y_pos):
            """Cria uma tabela formatada com os dados e retorna nova posição Y"""
            table_data = data_rows
            table = Table(table_data, colWidths=[10*cm, 4*cm])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), medium_gray),
                ('TEXTCOLOR', (0, 0), (-1, 0), dark_blue),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('GRID', (0, 0), (-1, -1), 0.5, medium_gray),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_gray]),
            ]))

            # Calcula altura real da tabela para evitar sobreposição com o cabeçalho
            table_width, table_height = table.wrap(0, 0)

            # Desenha a tabela logo abaixo do cabeçalho
            new_y = y_pos - table_height
            table.drawOn(p, 2*cm, new_y)

            # Retorna posição após a tabela
            return new_y - 0.3*cm
        
        # Dados Gerais
        y_position = draw_section_header("DADOS GERAIS", y_position)
        data_gerais = [
            ['Empregados', format_value(rem.empregados)],
            ['Horas Homem de Exposição', format_value(rem.horas_homem_exposicao, 2)],
        ]
        y_position = create_data_table(data_gerais, y_position)
        
        # Verifica espaço antes da próxima seção
        if y_position < 12*cm:
            p.showPage()
            y_position = height - 2*cm
        
        # Acidentes Típicos
        y_position -= 0.5*cm  # Espaço entre seções
        y_position = draw_section_header("ACIDENTES TÍPICOS", y_position, danger_color)
        acidentes_tipicos = [
            ['Fatalidades', format_value(rem.fatalidades)],
            ['Acidentes com Afastamento', format_value(rem.acidentes_com_afastamento_tipicos)],
            ['Tratamento Médico', format_value(rem.tratamento_medico)],
            ['Trabalho Restrito', format_value(rem.trabalho_restrito)],
            ['Primeiros Socorros', format_value(rem.primeiros_socorros)],
            ['Dias Perdidos/Debitados', format_value(rem.dias_perdidos_debitados)],
            ['Acidentados Registráveis', format_value(rem.acidentados_registraveis)],
        ]
        y_position = create_data_table(acidentes_tipicos, y_position)
        
        # Verifica espaço antes da próxima seção
        if y_position < 10*cm:
            p.showPage()
            y_position = height - 2*cm
        
        # Acidentes Não Típicos
        y_position -= 0.5*cm  # Espaço entre seções
        y_position = draw_section_header("ACIDENTES NÃO TÍPICOS", y_position, warning_color)
        acidentes_nao_tipicos = [
            ['Acidentes com Afastamento', format_value(rem.acidentes_com_afastamento)],
            ['Acidentes sem Afastamento', format_value(rem.acidentes_sem_afastamento)],
            ['Acidentes de Trânsito', format_value(rem.acidentes_transito)],
            ['Outros', format_value(rem.outros)],
        ]
        y_position = create_data_table(acidentes_nao_tipicos, y_position)
        
        # Verifica espaço antes da próxima seção
        if y_position < 10*cm:
            p.showPage()
            y_position = height - 2*cm
        
        # Taxas e Indicadores
        y_position -= 0.5*cm  # Espaço entre seções
        y_position = draw_section_header("TAXAS E INDICADORES", y_position, success_color)
        taxas = [
            ['Total Incidentes Registráveis', format_value(rem.total_incidentes_registraveis, 3)],
            ['Taxa com Afastamento', format_value(rem.taxa_com_afastamento, 3)],
            ['Taxa sem Afastamento', format_value(rem.taxa_sem_afastamento, 3)],
            ['Incidência', format_value(rem.incidencia, 3)],
            ['Gravidade', format_value(rem.gravidade, 3)],
            ['LMA NCA', format_value(rem.lma_nca)],
            ['LMA TFCA', format_value(rem.lma_tfca)],
        ]
        y_position = create_data_table(taxas, y_position)
        
        # Verifica espaço antes da próxima seção
        if y_position < 6*cm:
            p.showPage()
            y_position = height - 2*cm
        
        # Dados Adicionais
        y_position -= 0.5*cm  # Espaço entre seções
        y_position = draw_section_header("DADOS ADICIONAIS", y_position, primary_color)
        dados_adicionais = [
            ['Diesel Consumido (litros)', format_value(diesel.diesel_consumido) if diesel else 'Não informado'],
            ['Funcionários Demitidos', format_value(demitidos.funcionarios_demitidos) if demitidos else 'Não informado'],
        ]
        y_position = create_data_table(dados_adicionais, y_position)
        
        # Rodapé
        p.setFillColor(medium_gray)
        p.rect(0, 0, width, 1.5*cm, fill=True, stroke=False)
        p.setFillColor(dark_blue)
        p.setFont("Helvetica", 8)
        p.drawString(2*cm, 0.8*cm, f"Gerado em: {datetime.now().strftime('%d/%m/%Y às %H:%M')}")
        p.drawRightString(width - 2*cm, 0.8*cm, f"REM - {company.name}")
        
        p.showPage()
        p.save()

        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        filename = f"rem_{company_id}_{periodo.replace('-', '')}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @extend_schema(
        tags=['REM'],
        description="Exporta os dados de REM em formato XLSX para uma empresa e período específico.",
        parameters=[
            OpenApiParameter(name='company_id', description='ID da empresa', required=True, type=int, location=OpenApiParameter.QUERY),
            OpenApiParameter(name='periodo', description='Período no formato YYYY-MM-DD', required=True, type=str, location=OpenApiParameter.QUERY),
        ],
        responses={200: OpenApiResponse(response=OpenApiTypes.BINARY, description="Planilha XLSX"), 404: "REM não encontrado"}
    )
    @action(detail=False, methods=['get'], url_path='export/xlsx')
    def export_xlsx(self, request):
        """
        Endpoint para exportar dados de REM em XLSX com design profissional
        """
        company_id = request.query_params.get('company_id')
        periodo = request.query_params.get('periodo')

        if not company_id or not periodo:
            return Response({"detail": "company_id e periodo são obrigatórios."}, status=HTTP_400_BAD_REQUEST)

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({"detail": "Empresa não encontrada."}, status=HTTP_404_NOT_FOUND)

        # Verifica permissão
        access = user_has_access_to_company(request.user, company)
        if access is not True:
            return access

        # Busca os dados
        try:
            rem = Rem.objects.get(company=company, periodo=periodo)
        except Rem.DoesNotExist:
            return Response({"detail": "Dados REM não encontrados para este período."}, status=HTTP_404_NOT_FOUND)

        diesel = DieselConsumido.objects.filter(company=company, periodo=periodo).first()
        demitidos = FuncionariosDemitidos.objects.filter(company=company, periodo=periodo).first()

        # Meses em português
        periodo_date = datetime.strptime(periodo, '%Y-%m-%d')
        meses_pt = {
            1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
            5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
            9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
        }
        periodo_formatado = f"{meses_pt[periodo_date.month]}/{periodo_date.year}"

        # Cores da aplicação
        primary_color = PatternFill(start_color='1f64a9', end_color='1f64a9', fill_type='solid')
        dark_blue_color = PatternFill(start_color='012140', end_color='012140', fill_type='solid')
        success_color = PatternFill(start_color='48bb78', end_color='48bb78', fill_type='solid')
        warning_color = PatternFill(start_color='f6e05e', end_color='f6e05e', fill_type='solid')
        danger_color = PatternFill(start_color='ef4444', end_color='ef4444', fill_type='solid')
        light_gray = PatternFill(start_color='f8fafc', end_color='f8fafc', fill_type='solid')
        medium_gray = PatternFill(start_color='e4e7eb', end_color='e4e7eb', fill_type='solid')
        
        white_font = Font(bold=True, color='FFFFFF', size=12)
        white_font_large = Font(bold=True, color='FFFFFF', size=14)
        dark_font = Font(bold=True, color='012140', size=11)
        header_font = Font(bold=True, size=12)
        normal_font = Font(size=10)
        
        center_align = Alignment(horizontal='center', vertical='center')
        left_align = Alignment(horizontal='left', vertical='center')
        right_align = Alignment(horizontal='right', vertical='center')
        
        thin_border = Border(
            left=Side(style='thin', color='e4e7eb'),
            right=Side(style='thin', color='e4e7eb'),
            top=Side(style='thin', color='e4e7eb'),
            bottom=Side(style='thin', color='e4e7eb')
        )
        
        # Cria o workbook
        wb = Workbook()
        ws_resumo = wb.active
        ws_resumo.title = "Resumo"
        
        # Cabeçalho principal
        ws_resumo.merge_cells('A1:D1')
        ws_resumo['A1'] = 'RELATÓRIO REM - ESTATÍSTICAS DE ACIDENTES'
        ws_resumo['A1'].font = white_font_large
        ws_resumo['A1'].fill = primary_color
        ws_resumo['A1'].alignment = center_align
        ws_resumo.row_dimensions[1].height = 30
        
        # Informações da empresa
        ws_resumo.merge_cells('A2:D2')
        ws_resumo['A2'] = f'Empresa: {company.name}'
        ws_resumo['A2'].font = white_font
        ws_resumo['A2'].fill = dark_blue_color
        ws_resumo['A2'].alignment = left_align
        ws_resumo.row_dimensions[2].height = 25
        
        ws_resumo.merge_cells('A3:D3')
        ws_resumo['A3'] = f'Período: {periodo_formatado}'
        ws_resumo['A3'].font = dark_font
        ws_resumo['A3'].fill = medium_gray
        ws_resumo['A3'].alignment = left_align
        ws_resumo.row_dimensions[3].height = 20
        
        ws_resumo['A4'] = f'Gerado em: {datetime.now().strftime("%d/%m/%Y às %H:%M")}'
        ws_resumo['A4'].font = Font(size=9, italic=True)
        
        # Dados Gerais
        row = 6
        ws_resumo.merge_cells(f'A{row}:B{row}')
        ws_resumo[f'A{row}'] = 'DADOS GERAIS'
        ws_resumo[f'A{row}'].font = white_font
        ws_resumo[f'A{row}'].fill = primary_color
        ws_resumo[f'A{row}'].alignment = center_align
        ws_resumo.row_dimensions[row].height = 25
        
        dados_gerais = [
            ('Empregados', rem.empregados),
            ('Horas Homem de Exposição', float(rem.horas_homem_exposicao) if rem.horas_homem_exposicao else None),
        ]
        
        for label, value in dados_gerais:
            row += 1
            ws_resumo[f'A{row}'] = label
            ws_resumo[f'B{row}'] = value if value is not None else '-'
            ws_resumo[f'A{row}'].font = normal_font
            ws_resumo[f'B{row}'].font = normal_font
            ws_resumo[f'A{row}'].fill = light_gray
            ws_resumo[f'A{row}'].border = thin_border
            ws_resumo[f'B{row}'].border = thin_border
            ws_resumo[f'B{row}'].alignment = right_align
        
        # Sheet 2: Acidentes
        ws_acidentes = wb.create_sheet("Acidentes")
        
        # Cabeçalho
        ws_acidentes.merge_cells('A1:B1')
        ws_acidentes['A1'] = 'ACIDENTES E INCIDENTES'
        ws_acidentes['A1'].font = white_font_large
        ws_acidentes['A1'].fill = primary_color
        ws_acidentes['A1'].alignment = center_align
        ws_acidentes.row_dimensions[1].height = 30
        
        row = 3
        ws_acidentes.merge_cells(f'A{row}:B{row}')
        ws_acidentes[f'A{row}'] = 'ACIDENTES TÍPICOS'
        ws_acidentes[f'A{row}'].font = white_font
        ws_acidentes[f'A{row}'].fill = danger_color
        ws_acidentes[f'A{row}'].alignment = center_align
        ws_acidentes.row_dimensions[row].height = 25
        
        acidentes_tipicos = [
            ('Fatalidades', rem.fatalidades),
            ('Acidentes com Afastamento', rem.acidentes_com_afastamento_tipicos),
            ('Tratamento Médico', rem.tratamento_medico),
            ('Trabalho Restrito', rem.trabalho_restrito),
            ('Primeiros Socorros', rem.primeiros_socorros),
            ('Dias Perdidos/Debitados', rem.dias_perdidos_debitados),
            ('Acidentados Registráveis', rem.acidentados_registraveis),
        ]
        
        for label, value in acidentes_tipicos:
            row += 1
            ws_acidentes[f'A{row}'] = label
            ws_acidentes[f'B{row}'] = value if value is not None else '-'
            ws_acidentes[f'A{row}'].font = normal_font
            ws_acidentes[f'B{row}'].font = normal_font
            ws_acidentes[f'A{row}'].fill = light_gray if row % 2 == 0 else PatternFill()
            ws_acidentes[f'A{row}'].border = thin_border
            ws_acidentes[f'B{row}'].border = thin_border
            ws_acidentes[f'B{row}'].alignment = right_align
        
        row += 2
        ws_acidentes.merge_cells(f'A{row}:B{row}')
        ws_acidentes[f'A{row}'] = 'ACIDENTES NÃO TÍPICOS'
        ws_acidentes[f'A{row}'].font = white_font
        ws_acidentes[f'A{row}'].fill = warning_color
        ws_acidentes[f'A{row}'].alignment = center_align
        ws_acidentes.row_dimensions[row].height = 25
        
        acidentes_nao_tipicos = [
            ('Acidentes com Afastamento', rem.acidentes_com_afastamento),
            ('Acidentes sem Afastamento', rem.acidentes_sem_afastamento),
            ('Acidentes de Trânsito', rem.acidentes_transito),
            ('Outros', rem.outros),
        ]
        
        for label, value in acidentes_nao_tipicos:
            row += 1
            ws_acidentes[f'A{row}'] = label
            ws_acidentes[f'B{row}'] = value if value is not None else '-'
            ws_acidentes[f'A{row}'].font = normal_font
            ws_acidentes[f'B{row}'].font = normal_font
            ws_acidentes[f'A{row}'].fill = light_gray if row % 2 == 0 else PatternFill()
            ws_acidentes[f'A{row}'].border = thin_border
            ws_acidentes[f'B{row}'].border = thin_border
            ws_acidentes[f'B{row}'].alignment = right_align
        
        # Ajusta largura das colunas
        ws_acidentes.column_dimensions['A'].width = 35
        ws_acidentes.column_dimensions['B'].width = 20
        
        # Sheet 3: Taxas e Indicadores
        ws_taxas = wb.create_sheet("Taxas e Indicadores")
        
        # Cabeçalho
        ws_taxas.merge_cells('A1:B1')
        ws_taxas['A1'] = 'TAXAS E INDICADORES DE SEGURANÇA'
        ws_taxas['A1'].font = white_font_large
        ws_taxas['A1'].fill = success_color
        ws_taxas['A1'].alignment = center_align
        ws_taxas.row_dimensions[1].height = 30
        
        row = 3
        taxas = [
            ('Total Incidentes Registráveis', rem.total_incidentes_registraveis),
            ('Taxa com Afastamento', rem.taxa_com_afastamento),
            ('Taxa sem Afastamento', rem.taxa_sem_afastamento),
            ('Incidência', rem.incidencia),
            ('Gravidade', rem.gravidade),
            ('LMA NCA', rem.lma_nca),
            ('LMA TFCA', rem.lma_tfca),
        ]
        
        for label, value in taxas:
            ws_taxas[f'A{row}'] = label
            ws_taxas[f'B{row}'] = float(value) if value is not None and isinstance(value, (int, float)) else (value if value is not None else '-')
            ws_taxas[f'A{row}'].font = normal_font
            ws_taxas[f'B{row}'].font = normal_font
            ws_taxas[f'A{row}'].fill = light_gray if row % 2 == 1 else PatternFill()
            ws_taxas[f'A{row}'].border = thin_border
            ws_taxas[f'B{row}'].border = thin_border
            ws_taxas[f'B{row}'].alignment = right_align
            row += 1
        
        ws_taxas.column_dimensions['A'].width = 35
        ws_taxas.column_dimensions['B'].width = 20
        
        # Sheet 4: Dados Adicionais
        ws_adicionais = wb.create_sheet("Dados Adicionais")
        
        # Cabeçalho
        ws_adicionais.merge_cells('A1:B1')
        ws_adicionais['A1'] = 'DADOS ADICIONAIS'
        ws_adicionais['A1'].font = white_font_large
        ws_adicionais['A1'].fill = primary_color
        ws_adicionais['A1'].alignment = center_align
        ws_adicionais.row_dimensions[1].height = 30
        
        row = 3
        ws_adicionais[f'A{row}'] = 'Diesel Consumido (litros)'
        ws_adicionais[f'B{row}'] = diesel.diesel_consumido if diesel and diesel.diesel_consumido is not None else '-'
        ws_adicionais[f'A{row}'].font = normal_font
        ws_adicionais[f'B{row}'].font = normal_font
        ws_adicionais[f'A{row}'].fill = light_gray
        ws_adicionais[f'A{row}'].border = thin_border
        ws_adicionais[f'B{row}'].border = thin_border
        ws_adicionais[f'B{row}'].alignment = right_align
        
        row += 1
        ws_adicionais[f'A{row}'] = 'Funcionários Demitidos'
        ws_adicionais[f'B{row}'] = demitidos.funcionarios_demitidos if demitidos and demitidos.funcionarios_demitidos is not None else '-'
        ws_adicionais[f'A{row}'].font = normal_font
        ws_adicionais[f'B{row}'].font = normal_font
        ws_adicionais[f'A{row}'].border = thin_border
        ws_adicionais[f'B{row}'].border = thin_border
        ws_adicionais[f'B{row}'].alignment = right_align
        
        ws_adicionais.column_dimensions['A'].width = 30
        ws_adicionais.column_dimensions['B'].width = 20
        
        # Ajusta largura das colunas do resumo
        ws_resumo.column_dimensions['A'].width = 35
        ws_resumo.column_dimensions['B'].width = 20
        
        # Salva em buffer
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        
        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        filename = f"rem_{company_id}_{periodo.replace('-', '')}.xlsx"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

@extend_schema(tags=['Diesel Consumido'])
class DieselConsumidoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar os dados de Diesel Consumido.
    """
    queryset = DieselConsumido.objects.all()
    serializer_class = DieselConsumidoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return DieselConsumido.objects.all()
        return DieselConsumido.objects.filter(company__user=user)

    def perform_create(self, serializer):
        user = self.request.user
        company_id = self.request.data.get('company')
        if not company_id:
            raise ValidationError("O campo 'company' é obrigatório.")

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            raise ValidationError("Empresa não encontrada.")

        access = user_has_access_to_company(user, company)
        if access is not True:
            return access

        serializer.save(company=company)

@extend_schema(tags=['Funcionarios Demitidos'])
class FuncionariosDemitidosViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar os dados de Funcionários Demitidos.
    """
    queryset = FuncionariosDemitidos.objects.all()
    serializer_class = FuncionariosDemitidosSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return FuncionariosDemitidos.objects.all()
        return FuncionariosDemitidos.objects.filter(company__user=user)

    def perform_create(self, serializer):
        user = self.request.user
        company_id = self.request.data.get('company')
        if not company_id:
            raise ValidationError("O campo 'company' é obrigatório.")

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            raise ValidationError("Empresa não encontrada.")

        access = user_has_access_to_company(user, company)
        if access is not True:
            return access

        serializer.save(company=company)
