from django.urls import re_path
from todos import views

urlpatterns = [
    re_path(r'^api/tasks/?$', views.tasks),
    re_path(r'^api/tasks/(?P<task_id>[0-9]+)/?$', views.task_detail),
]
