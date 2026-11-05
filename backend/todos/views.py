import json
from datetime import date

from django.conf import settings
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.http import require_http_methods

from .models import Task


def csrf_failure(request, reason=''):
    message = 'Couldn’t verify this request. Refresh the page and try again.'
    if settings.DEBUG and reason.startswith(('Origin checking failed', 'Referer checking failed')):
        message = (
            'This app address is not trusted by the server. Add the browser’s origin '
            'to DJANGO_CSRF_TRUSTED_ORIGINS and restart Django.'
        )
    return JsonResponse({'error': message, 'code': 'csrf_failed'}, status=403)


def serialize(task):
    return {
        'id': task.id, 'title': task.title, 'notes': task.notes,
        'project': task.project, 'priority': task.priority,
        'due_date': task.due_date.isoformat() if task.due_date else None,
        'completed': task.completed, 'created_at': task.created_at.isoformat(),
    }


def validate(request):
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        raise ValueError('Send a valid JSON object.')
    if not isinstance(data, dict):
        raise ValueError('Send a valid JSON object.')
    if set(data) - {'title', 'notes', 'project', 'priority', 'due_date', 'completed'}:
        raise ValueError('Unknown task field.')
    for field, limit in [('title', 200), ('notes', 2000)]:
        if field in data:
            if not isinstance(data[field], str) or len(data[field].strip()) > limit:
                raise ValueError(f'{field.capitalize()} must be text with at most {limit} characters.')
            data[field] = data[field].strip()
    if 'title' in data and not data['title']:
        raise ValueError('Give your task a name.')
    if 'priority' in data and data['priority'] not in ['low', 'medium', 'high']:
        raise ValueError('Choose a valid priority.')
    if 'project' in data and data['project'] not in ['Personal', 'Work', 'Learning']:
        raise ValueError('Choose a valid project.')
    if 'completed' in data and not isinstance(data['completed'], bool):
        raise ValueError('Completed must be true or false.')
    if 'due_date' in data and data['due_date'] is not None:
        try:
            data['due_date'] = date.fromisoformat(data['due_date'])
        except (ValueError, TypeError):
            raise ValueError('Choose a valid due date.')
    return data


@require_http_methods(['GET', 'POST'])
def tasks(request):
    if not request.session.session_key:
        request.session.create()
    owner = request.session.session_key
    if request.method == 'GET':
        return JsonResponse({'tasks': [serialize(t) for t in Task.objects.filter(owner=owner)],
                             'csrfToken': get_token(request)})
    try:
        data = validate(request)
        if not data.get('title'):
            raise ValueError('Give your task a name.')
        task = Task.objects.create(owner=owner, **data)
    except ValueError as error:
        return JsonResponse({'error': str(error)}, status=400)
    return JsonResponse(serialize(task), status=201)


@require_http_methods(['PATCH', 'DELETE'])
def task_detail(request, task_id):
    task = Task.objects.filter(id=task_id, owner=request.session.session_key).first()
    if task is None:
        return JsonResponse({'error': 'Task not found.'}, status=404)
    if request.method == 'DELETE':
        task.delete()
        return JsonResponse({'deleted': True})
    try:
        data = validate(request)
    except ValueError as error:
        return JsonResponse({'error': str(error)}, status=400)
    for key, value in data.items():
        setattr(task, key, value)
    task.save()
    return JsonResponse(serialize(task))
