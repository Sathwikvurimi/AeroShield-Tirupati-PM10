import unittest
import json
from app import app

class AeroShieldTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_pages(self):
        pages = ['/', '/live', '/prediction', '/historical', '/data-quality', '/models', '/anomalies', '/history', '/about']
        for page in pages:
            response = self.app.get(page)
            self.assertEqual(response.status_code, 200, f"Page {page} failed")
            print(f"Verified Page: {page} -> OK (200)")

    def test_api_endpoints(self):
        apis = [
            '/api/current-pm10',
            '/api/locations',
            '/api/historical-pm10?limit=10',
            '/api/data-quality',
            '/api/prediction',
            '/api/weather',
            '/api/past-24h-pm10',
            '/api/model-performance',
            '/api/anomalies',
            '/api/prediction-history'
        ]
        for api in apis:
            response = self.app.get(api)
            self.assertEqual(response.status_code, 200, f"API {api} failed")
            data = json.loads(response.data)
            self.assertEqual(data.get('status'), 'success', f"API {api} status not success")
            print(f"Verified REST API: {api} -> OK (200)")

    def test_exports(self):
        exports = ['/api/export/historical', '/api/export/predictions', '/api/export/anomalies']
        for exp in exports:
            response = self.app.get(exp)
            self.assertEqual(response.status_code, 200, f"Export {exp} failed")
            print(f"Verified Export CSV: {exp} -> OK (200)")

if __name__ == '__main__':
    unittest.main()
