# Generated by Django 5.1 on 2024-10-23 15:00

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0014_actionplan_attachment'),
    ]

    operations = [
        migrations.AddField(
            model_name='actionplan',
            name='response_company',
            field=models.TextField(blank=True, null=True),
        ),
    ]
