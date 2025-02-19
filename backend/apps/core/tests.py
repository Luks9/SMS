from django.test import TestCase
from django.contrib.auth.models import User
from .models import Company, CategoryQuestion, Subcategory, Question, Form, Evaluation, Answer

class EvaluationTestCase(TestCase):
    
    def setUp(self):
        # Criando um usuário
        self.user = User.objects.create_user(username='test user', password='12345')
        
        # Criando uma empresa
        self.company = Company.objects.create(name='Test Company', cnpj='00.000.000/0001-91', user=self.user)
        
        # Criando uma categoria de perguntas
        self.category = CategoryQuestion.objects.create(name='Safety', weight=1.0)
        
        # Criando uma subcategoria
        self.subcategory = Subcategory.objects.create(name='Fire Safety', category=self.category)
        
        # Criando algumas perguntas
        self.question1 = Question.objects.create(category=self.category, subcategory=self.subcategory, question='Is there a fire extinguisher?')
        self.question2 = Question.objects.create(category=self.category, subcategory=self.subcategory, question='Are fire exits clearly marked?')
        
        # Criando um formulário
        self.form = Form.objects.create(name='Safety Form')
        self.form.categories.add(self.category)
        
        # Criando uma avaliação
        self.evaluation = Evaluation.objects.create(
            company=self.company,
            evaluator=self.user,
            form=self.form,
            valid_until='2024-12-31'
        )
    
    def test_add_fake_answers_to_evaluation(self):
        # Adicionando respostas falsas
        Answer.objects.create(
            question=self.question1,
            evaluation=self.evaluation,
            company=self.company,
            answer_respondent='C',
            note='Everything is in order.'
        )
        
        Answer.objects.create(
            question=self.question2,
            evaluation=self.evaluation,
            company=self.company,
            answer_respondent='NC',
            note='Fire exits are not clearly marked.'
        )
        
        # Recuperando as respostas associadas à avaliação
        answers = Answer.objects.filter(evaluation=self.evaluation)
        
        # Verificando se as respostas foram adicionadas corretamente
        self.assertEqual(answers.count(), 2)
        self.assertEqual(answers[0].question, self.question1)
        self.assertEqual(answers[0].answer_respondent, 'C')
        self.assertEqual(answers[1].question, self.question2)
        self.assertEqual(answers[1].answer_respondent, 'NC')

        # Verificando os detalhes das respostas
        self.assertEqual(answers[0].note, 'Everything is in order.')
        self.assertEqual(answers[1].note, 'Fire exits are not clearly marked.')
