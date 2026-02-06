import re
import textwrap
import os
from io import BytesIO
from datetime import datetime
from django.http import HttpResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.pdfgen import canvas
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side


# =============================================================================
# CNPJ Utilities
# =============================================================================

def format_cnpj(cnpj):
    """
    Remove caracteres não numéricos do CNPJ para armazenamento no banco
    """
    if not cnpj:
        return cnpj
    
    # Remove todos os caracteres não numéricos para armazenar apenas números
    return re.sub(r'[^0-9]', '', str(cnpj))

def format_cnpj_display(cnpj):
    """
    Formata o CNPJ para exibição no padrão XX.XXX.XXX/XXXX-XX
    """
    if not cnpj:
        return cnpj
    
    # Remove todos os caracteres não numéricos
    cnpj_numbers = re.sub(r'[^0-9]', '', str(cnpj))
    
    # Se não tiver 14 dígitos, retorna como está
    if len(cnpj_numbers) != 14:
        return cnpj_numbers
    
    # Aplica a formatação XX.XXX.XXX/XXXX-XX
    return f"{cnpj_numbers[:2]}.{cnpj_numbers[2:5]}.{cnpj_numbers[5:8]}/{cnpj_numbers[8:12]}-{cnpj_numbers[12:14]}"

def validate_cnpj(cnpj):
    """
    Valida se o CNPJ é válido
    """
    if not cnpj:
        return False
    
    # Remove caracteres não numéricos
    cnpj_numbers = re.sub(r'[^0-9]', '', str(cnpj))
    
    # Verifica se tem 14 dígitos
    if len(cnpj_numbers) != 14:
        return False
    
    # Verifica se não é uma sequência de números iguais
    if cnpj_numbers == cnpj_numbers[0] * 14:
        return False
    
    return True

def clean_cnpj(cnpj):
    """
    Remove formatação do CNPJ, mantendo apenas números
    """
    if not cnpj:
        return cnpj
    return re.sub(r'[^0-9]', '', str(cnpj))


# =============================================================================
# Report Generation Utilities
# =============================================================================

def get_answer_labels():
    """
    Retorna o dicionário de labels das respostas
    """
    from .models import ANSWER_CHOICES
    return dict(ANSWER_CHOICES)


def attachment_label(value):
    """
    Converte valor booleano em label de anexo
    """
    return "Sim" if value else "Não"


def choice_label(value):
    """
    Converte código de resposta em label legível
    """
    if not value:
        return 'Sem resposta'
    answer_labels = get_answer_labels()
    return answer_labels.get(value, value)


def build_export_payload(evaluation, request=None):
    """
    Constrói o payload de dados para exportação com campos formatados
    """
    from .serializers import EvaluationDetailSerializer, ActionPlanSerializer
    
    serializer = EvaluationDetailSerializer(
        evaluation, context={'request': request} if request else {}
    )
    data = serializer.data
    data['period_display'] = evaluation.period.strftime('%m/%Y') if evaluation.period else '-'
    data['valid_until_display'] = evaluation.valid_until.strftime('%d/%m/%Y') if evaluation.valid_until else '-'
    data['score_display'] = f"{evaluation.score:.2f}" if evaluation.score is not None else '-'
    action_plan = evaluation.action_plans.first()
    data['action_plan'] = ActionPlanSerializer(action_plan).data if action_plan else None
    return data


def export_pdf(evaluation, request=None):
    """
    Gera e retorna um relatório PDF da avaliação
    """
    payload = build_export_payload(evaluation, request)

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y_position = height - 40

    styles = getSampleStyleSheet()
    normal_style = styles['Normal']
    normal_style.fontName = 'Helvetica'
    normal_style.fontSize = 9
    normal_style.leading = 11

    primary_color = colors.HexColor('#1f64a9')
    dark_blue = colors.HexColor('#012140')
    light_gray = colors.HexColor('#f8fafc')
    medium_gray = colors.HexColor('#e4e7eb')

    def draw_header_footer():
        # Header
        pdf.setFillColor(primary_color)
        pdf.rect(0, height - 2.4 * cm, width, 2.4 * cm, fill=True, stroke=False)
        pdf.setFillColor(colors.white)
        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawString(2 * cm, height - 1.1 * cm, "RELATÓRIO DE AVALIAÇÃO")
        pdf.setFont("Helvetica", 11)
        pdf.drawString(2 * cm, height - 1.7 * cm, "Resumo de perguntas e respostas")

        pdf.setFillColor(dark_blue)
        pdf.rect(0, height - 4.1 * cm, width, 1.7 * cm, fill=True, stroke=False)
        pdf.setFillColor(colors.white)
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(2 * cm, height - 3.0 * cm, f"Empresa: {payload.get('company_name')}")
        pdf.setFont("Helvetica", 10)
        pdf.drawString(2 * cm, height - 3.5 * cm, f"Período: {payload.get('period_display')}")

        # Footer
        pdf.setFillColor(medium_gray)
        pdf.rect(0, 0, width, 1.4 * cm, fill=True, stroke=False)
        pdf.setFillColor(dark_blue)
        pdf.setFont("Helvetica", 8)
        pdf.drawString(2 * cm, 0.7 * cm, f"Gerado em: {datetime.now().strftime('%d/%m/%Y às %H:%M')}")
        pdf.drawRightString(width - 2 * cm, 0.7 * cm, f"Avaliação #{evaluation.id}")

    def reset_page():
        nonlocal y_position
        draw_header_footer()
        y_position = height - 4.8 * cm

    def count_wrapped_lines(text, wrap_width=100):
        wrapped_lines = textwrap.wrap(str(text), width=wrap_width) or ['']
        return len(wrapped_lines)

    def ensure_space(required_height):
        nonlocal y_position
        if y_position - required_height <= 60:
            pdf.showPage()
            reset_page()

    def write_line(text, font="Helvetica", size=10, leading=14):
        nonlocal y_position
        wrapped_lines = textwrap.wrap(text, width=100) or ['']
        for line in wrapped_lines:
            pdf.setFont(font, size)
            pdf.drawString(2 * cm, y_position, line)
            y_position -= leading

    def estimate_block_height(lines, wrap_width=100):
        total = 0
        for text, leading in lines:
            total += count_wrapped_lines(text, wrap_width) * leading
        return total

    def draw_section_header(title, y_pos, color=primary_color):
        header_height = 0.6 * cm
        pdf.setFillColor(color)
        pdf.rect(1.5 * cm, y_pos - header_height, width - 3 * cm, header_height, fill=True, stroke=False)
        pdf.setFillColor(colors.white)
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(2 * cm, y_pos - header_height + 0.15 * cm, title)
        return y_pos - header_height - 0.2 * cm

    def draw_kv_table(rows, y_pos):
        table = Table(rows, colWidths=[5 * cm, 11 * cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), medium_gray),
            ('TEXTCOLOR', (0, 0), (-1, 0), dark_blue),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('GRID', (0, 0), (-1, -1), 0.4, medium_gray),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_gray]),
        ]))
        table_width, table_height = table.wrap(0, 0)
        new_y = y_pos - table_height
        table.drawOn(pdf, 1.5 * cm, new_y)
        return new_y - 0.3 * cm

    reset_page()
    y_position = draw_section_header("Resumo da Avaliação", y_position)
    summary_rows = [
        ["Campo", "Valor"],
        ["Empresa", payload.get('company_name')],
        ["Formulário", payload.get('form_name')],
        ["Período", payload.get('period_display')],
        ["Status", payload.get('status')],
        ["Nota", payload.get('score_display')],
        ["Validade", payload.get('valid_until_display')],
    ]
    y_position = draw_kv_table(summary_rows, y_position)

    y_position = draw_section_header("Perguntas e respostas", y_position, primary_color)

    questions = payload.get('questions', [])
    for index, question in enumerate(questions, start=1):
        answer = question.get('answer') or {}
        question_lines = [
            (f"Pergunta {index}: {question.get('question')}", 16),
        ]
        if question.get('recommendation'):
            question_lines.append((f"Recomendação: {question.get('recommendation')}", 14))
        question_lines.extend([
            (f"Empresa: {choice_label(answer.get('answer_respondent'))}", 14),
            (f"Anexo da Empresa: {attachment_label(answer.get('attachment_respondent'))}", 14),
            (f"Avaliador: {choice_label(answer.get('answer_evaluator'))}", 14),
            (f"Anexo do avaliador: {attachment_label(answer.get('attachment_evaluator'))}", 14),
        ])
        if answer.get('note'):
            question_lines.append((f"Observação: {answer.get('note')}", 14))
        question_lines.append(("-" * 60, 14))

        def wrap_cell(value):
            return Paragraph(str(value), normal_style)

        estimate_rows = [
            ["Campo", "Valor"],
            ["Categoria", wrap_cell(question.get('category_name') or '-')],
            ["Pergunta", wrap_cell(question.get('question') or '-')],
            ["Recomendação", wrap_cell(question.get('recommendation') or '-')],
            ["Empresa", wrap_cell(choice_label(answer.get('answer_respondent')))],
            ["Anexo da Empresa", wrap_cell(attachment_label(answer.get('attachment_respondent')))],
            ["Avaliador", wrap_cell(choice_label(answer.get('answer_evaluator')))],
            ["Anexo do Avaliador", wrap_cell(attachment_label(answer.get('attachment_evaluator')))],
            ["Observação", wrap_cell(answer.get('note') or '-')],
        ]
        table = Table(estimate_rows, colWidths=[5 * cm, 11 * cm], repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), medium_gray),
            ('TEXTCOLOR', (0, 0), (-1, 0), dark_blue),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('GRID', (0, 0), (-1, -1), 0.4, medium_gray),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_gray]),
        ]))
        table_width, table_height = table.wrap(0, 0)
        ensure_space(table_height + (0.8 * cm))

        y_position = draw_section_header(f"Pergunta {index}", y_position, dark_blue)
        y_position = draw_kv_table(estimate_rows, y_position)

    if payload.get('action_plan'):
        plan = payload['action_plan']
        plan_lines = [
            ("Plano de Ação", 18),
            (f"Descrição: {plan.get('description')}", 14),
            (f"Status: {plan.get('status')}", 14),
            (f"Data de término: {plan.get('end_date') or '-'}", 14),
        ]
        if plan.get('response_company'):
            plan_lines.append((f"Resposta da empresa: {plan.get('response_company')}", 14))
        ensure_space(estimate_block_height(plan_lines))
        y_position = draw_section_header("Plano de Ação", y_position, primary_color)
        for text, leading in plan_lines:
            write_line(text, leading=leading)

    pdf.save()
    buffer.seek(0)
    filename = f"avaliacao_{evaluation.id}.pdf"
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


def export_xlsx(evaluation, request=None):
    """
    Gera e retorna um relatório XLSX da avaliação
    """
    payload = build_export_payload(evaluation, request)

    workbook = Workbook()
    summary_sheet = workbook.active
    summary_sheet.title = "Resumo"
    header_fill = PatternFill(start_color='1f64a9', end_color='1f64a9', fill_type='solid')
    light_fill = PatternFill(start_color='f8fafc', end_color='f8fafc', fill_type='solid')
    border = Border(
        left=Side(style='thin', color='e4e7eb'),
        right=Side(style='thin', color='e4e7eb'),
        top=Side(style='thin', color='e4e7eb'),
        bottom=Side(style='thin', color='e4e7eb')
    )
    header_font = Font(bold=True, color='FFFFFF')
    bold_font = Font(bold=True)
    summary_rows = [
        ("Empresa", payload.get('company_name')),
        ("Formulário", payload.get('form_name')),
        ("Período", payload.get('period_display')),
        ("Status", payload.get('status')),
        ("Nota", payload.get('score_display')),
        ("Validade", payload.get('valid_until_display')),
    ]
    for row in summary_rows:
        summary_sheet.append(row)
    summary_sheet['A1'].font = bold_font
    summary_sheet['A1'].fill = light_fill
    for row in summary_sheet.iter_rows(min_row=1, max_row=summary_sheet.max_row, min_col=1, max_col=2):
        for cell in row:
            cell.border = border
    summary_sheet.column_dimensions['A'].width = 18
    summary_sheet.column_dimensions['B'].width = 50

    questions_sheet = workbook.create_sheet("Perguntas")
    questions_sheet.append(["Categoria", "Pergunta", "Empresa", "Avaliador", "Observação", "Anexo da Empresa", "Anexo do Avaliador"])
    for cell in questions_sheet[1]:
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = border
    for question in payload.get('questions', []):
        answer = question.get('answer') or {}
        questions_sheet.append([
            question.get('category_name') or '-',
            question.get('question') or '-',
            choice_label(answer.get('answer_respondent')),
            choice_label(answer.get('answer_evaluator')),
            answer.get('note') or '-',
            attachment_label(answer.get('attachment_respondent')),
            attachment_label(answer.get('attachment_evaluator'))
        ])
    questions_sheet.column_dimensions['A'].width = 28
    questions_sheet.column_dimensions['B'].width = 60
    questions_sheet.column_dimensions['C'].width = 16
    questions_sheet.column_dimensions['D'].width = 16
    questions_sheet.column_dimensions['E'].width = 40
    questions_sheet.column_dimensions['F'].width = 18
    questions_sheet.column_dimensions['G'].width = 20

    for row in questions_sheet.iter_rows(min_row=1, max_row=questions_sheet.max_row, min_col=1, max_col=7):
        for cell in row:
            cell.border = border
            if cell.row > 1:
                cell.alignment = Alignment(wrap_text=True, vertical='top')

    if payload.get('action_plan'):
        plan = payload['action_plan']
        plan_sheet = workbook.create_sheet("Plano de Ação")
        plan_sheet.append(["Campo", "Valor"])
        for cell in plan_sheet[1]:
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = border
        plan_rows = [
            ("Descrição", plan.get('description') or '-'),
            ("Status", plan.get('status') or '-'),
            ("Data de início", plan.get('start_date') or '-'),
            ("Data de término", plan.get('end_date') or '-'),
            ("Responsável", plan.get('responsible_name') or '-'),
            ("Resposta da empresa", plan.get('response_company') or '-'),
        ]
        for row in plan_rows:
            plan_sheet.append(row)
        for row in plan_sheet.iter_rows(min_row=1, max_row=plan_sheet.max_row, min_col=1, max_col=2):
            for cell in row:
                cell.border = border
        plan_sheet.column_dimensions['A'].width = 20
        plan_sheet.column_dimensions['B'].width = 60

    output = BytesIO()
    workbook.save(output)
    output.seek(0)

    filename = f"avaliacao_{evaluation.id}.xlsx"
    response = HttpResponse(
        output,
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response
