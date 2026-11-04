#!/usr/bin/env python3
"""Τοπικός server για τον Πολύγλωσσο.
Τρέξε:  python3 serve.py        → άνοιξε http://localhost:8000
Σε Android (Termux): pkg install python && python serve.py  → Chrome: http://localhost:8000
"""
import http.server, socketserver, os, sys
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
DIR = os.path.dirname(os.path.abspath(__file__))
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.webmanifest': 'application/manifest+json', '.js': 'text/javascript'}
    def __init__(self, *a, **k): super().__init__(*a, directory=DIR, **k)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', PORT), H) as s:
    print(f'Πολύγλωσσος: http://localhost:{PORT}  (Ctrl+C για τερματισμό)')
    try: s.serve_forever()
    except KeyboardInterrupt: pass
