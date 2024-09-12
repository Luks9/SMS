from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.core.models import Company, Evaluation, Question, Answer
from django.core.files import File  # Import necessário para trabalhar com arquivos

class Command(BaseCommand):
    help = 'Adiciona respostas falsas a uma avaliação específica de uma empresa, com anexos.'

    def add_arguments(self, parser):
        parser.add_argument('company_id', type=int, help='ID da empresa')
        parser.add_argument('evaluation_id', type=int, help='ID da avaliação')
        parser.add_argument('file_path', type=str, help='Caminho do arquivo para anexar')  # Adiciona o caminho do arquivo

    def handle(self, *args, **kwargs):
        company_id = kwargs['company_id']
        evaluation_id = kwargs['evaluation_id']
        file_path = kwargs['file_path']

        try:
            company = Company.objects.get(id=company_id)
            evaluation = Evaluation.objects.get(id=evaluation_id, company=company)
        except Company.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Empresa com ID {company_id} não encontrada."))
            return
        except Evaluation.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Avaliação com ID {evaluation_id} não encontrada para a empresa {company.name}."))
            return

        # Obtendo as perguntas relacionadas ao formulário da avaliação
        questions = Question.objects.filter(category__forms=evaluation.form)

        if not questions.exists():
            self.stdout.write(self.style.WARNING('Nenhuma pergunta encontrada para o formulário desta avaliação.'))
            return

        # Verificando se o arquivo existe
        try:
            with open(file_path, 'rb') as file:
                django_file = File(file)  # Converte para um File do Django
                
                # Adicionando respostas falsas com anexos
                for question in questions:
                    answer, created = Answer.objects.get_or_create(
                        question=question,
                        evaluation=evaluation,
                        company=company,
                        defaults={
                            'answer_respondent': 'C',  # 'C' para Conforme, você pode personalizar isso
                            'note': 'Resposta gerada automaticamente.',
                            'date_respondent': timezone.now().date(),
                        }
                    )
                    # Se for criada uma nova resposta, adiciona o anexo
                    if created:
                        answer.attachment_respondent.save(f'{question.id}_anexo.pdf', django_file)
                        answer.save()
                        self.stdout.write(self.style.SUCCESS(f'Resposta criada para a pergunta: {question.question} com anexo.'))
                    else:
                        self.stdout.write(self.style.WARNING(f'Resposta já existente para a pergunta: {question.question}'))
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f"Arquivo {file_path} não encontrado."))
            return

        self.stdout.write(self.style.SUCCESS('Respostas falsas adicionadas com sucesso!'))
