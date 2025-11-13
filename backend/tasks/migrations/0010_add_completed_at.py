from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('tasks', '0009_remove_task_completed_task_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]