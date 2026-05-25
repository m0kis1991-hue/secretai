#!/usr/bin/env python3
"""
Απλός τοπικός web server για την εφαρμογή ΣυνεργείοPro.
Τρέξε:  python serve.py
Άνοιξε: http://localhost:8000
"""
import http.server
import socketserver
import os
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Επιτρέπει στο service worker να φορτώνει
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    if len(sys.argv) > 1:
        try:
            PORT = int(sys.argv[1])
        except ValueError:
            pass
    with socketserver.TCPServer(('', PORT), Handler) as httpd:
        print(f'Server τρέχει στο: http://localhost:{PORT}')
        print(f'Φάκελος: {DIRECTORY}')
        print('Πάτα Ctrl+C για διακοπή.')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nΔιακόπηκε.')
