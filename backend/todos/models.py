from django.db import models


class Task(models.Model):
    owner = models.CharField(max_length=40, db_index=True)
    title = models.CharField(max_length=200)
    notes = models.TextField(blank=True, max_length=2000)
    project = models.CharField(max_length=20, default='Personal')
    priority = models.CharField(max_length=10, default='medium')
    due_date = models.DateField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']
