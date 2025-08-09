#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 9292
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def do_GET(self):
        if self.path == '/' or self.path == '':
            # Serve the CS16 game HTML
            self.path = '/cs16_game.html'
        return super().do_GET()

print("🎮 Starting CS 1.6 2D Server...")
print("📱 Mac touchpad optimized!")
print(f"🌐 Open http://localhost:{PORT} in your browser")
print("Press Ctrl+C to stop")

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    httpd.serve_forever()