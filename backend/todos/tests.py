import json
from django.test import Client, TestCase


class TaskAPITests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        response = self.client.get('/api/tasks/')
        self.token = response.json()['csrfToken']

    def write(self, method, url, data=None):
        return getattr(self.client, method)(url, data=json.dumps(data or {}),
                                           content_type='application/json', HTTP_X_CSRFTOKEN=self.token)

    def test_create_read_update_delete(self):
        response = self.write('post', '/api/tasks/', {'title': 'Plan my day', 'project': 'Work', 'priority': 'high', 'due_date': '2026-09-12'})
        self.assertEqual(response.status_code, 201)
        task_id = response.json()['id']
        self.assertEqual(self.client.get('/api/tasks/').json()['tasks'][0]['title'], 'Plan my day')
        updated = self.write('patch', f'/api/tasks/{task_id}/', {'title': 'Updated task', 'completed': True, 'due_date': None})
        self.assertTrue(updated.json()['completed'])
        self.assertIsNone(updated.json()['due_date'])
        self.assertEqual(updated.json()['title'], 'Updated task')
        self.assertEqual(self.write('delete', f'/api/tasks/{task_id}/').status_code, 200)
        self.assertEqual(self.client.get('/api/tasks/').json()['tasks'], [])

    def test_workspace_isolation(self):
        task = self.write('post', '/api/tasks/', {'title': 'Private task'}).json()
        other = Client()
        self.assertEqual(other.get('/api/tasks/').json()['tasks'], [])
        self.assertEqual(other.patch(f"/api/tasks/{task['id']}/", data=json.dumps({'completed': True}), content_type='application/json').status_code, 404)
        self.assertEqual(other.delete(f"/api/tasks/{task['id']}/").status_code, 404)

    def test_validation(self):
        for data in [{'title': ''}, {'title': ' '}, {'title': 'x' * 201}, {'title': 'Task', 'priority': 'urgent'}, {'title': 'Task', 'project': 'Unknown'}, {'title': 'Task', 'completed': 'false'}, {'title': 'Task', 'due_date': 'bad'}, {'title': 'Task', 'owner': 'someone'}, ['not', 'object']]:
            with self.subTest(data=data):
                self.assertEqual(self.write('post', '/api/tasks/', data).status_code, 400)
        self.assertEqual(self.client.post('/api/tasks/', data='{bad', content_type='application/json', HTTP_X_CSRFTOKEN=self.token).status_code, 400)

    def test_csrf_is_required(self):
        response = self.client.post('/api/tasks/', data=json.dumps({'title': 'Blocked'}), content_type='application/json')
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()['code'], 'csrf_failed')
        self.assertIn('Refresh the page', response.json()['error'])

    def test_local_frontend_origins_can_create_tasks(self):
        for host in ('localhost', '127.0.0.1'):
            for port in (3000, 3001):
                with self.subTest(host=host, port=port):
                    response = self.client.post(
                        '/api/tasks/', data=json.dumps({'title': 'A task from Next.js'}),
                        content_type='application/json', HTTP_X_CSRFTOKEN=self.token,
                        HTTP_ORIGIN=f'http://{host}:{port}',
                    )
                    self.assertEqual(response.status_code, 201)

    def test_untrusted_origin_is_rejected_even_with_valid_token(self):
        response = self.client.post(
            '/api/tasks/', data=json.dumps({'title': 'Blocked task'}),
            content_type='application/json', HTTP_X_CSRFTOKEN=self.token,
            HTTP_ORIGIN='https://untrusted.example',
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()['code'], 'csrf_failed')
        self.assertEqual(self.client.get('/api/tasks/').json()['tasks'], [])

    def test_unknown_task_and_method(self):
        self.assertEqual(self.write('patch', '/api/tasks/999/', {'completed': True}).status_code, 404)
        self.assertEqual(self.client.put('/api/tasks/', HTTP_X_CSRFTOKEN=self.token).status_code, 405)

    def test_proxy_paths_work_without_trailing_slashes(self):
        self.assertEqual(self.client.get('/api/tasks').status_code, 200)
        task = self.write('post', '/api/tasks', {'title': 'No redirect'}).json()
        self.assertEqual(self.write('patch', f"/api/tasks/{task['id']}", {'completed': True}).status_code, 200)
