#!/usr/bin/env python3
"""Loopback-only, read-only DAV fixture for real GVfs integration tests."""
from http.server import BaseHTTPRequestHandler, HTTPServer
import sys

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('DAV', '1, 2')
        self.send_header('Allow', 'OPTIONS, GET, HEAD, PROPFIND')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_PROPFIND(self):
        length = int(self.headers.get('Content-Length', 0))
        self.rfile.read(length)
        is_file = self.path.endswith('/hello.txt')
        paths = [(self.path if is_file else self.path.rstrip('/') + '/', not is_file)]
        if not is_file and self.headers.get('Depth') != '0':
            paths.append((self.path.rstrip('/') + '/hello.txt', False))
        responses = []
        for path, collection in paths:
            kind = '<d:collection/>' if collection else ''
            responses.append(f'''<d:response><d:href>{path}</d:href><d:propstat><d:prop>
              <d:resourcetype>{kind}</d:resourcetype><d:getcontentlength>6</d:getcontentlength>
              <d:getcontenttype>text/plain</d:getcontenttype>
              <d:getlastmodified>Sat, 26 Sep 2026 00:00:00 GMT</d:getlastmodified>
              </d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>''')
        body = ('<?xml version="1.0"?><d:multistatus xmlns:d="DAV:">' + ''.join(responses) + '</d:multistatus>').encode()
        self.send_response(207)
        self.send_header('Content-Type', 'application/xml; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.send_header('Content-Length', '6')
        self.end_headers()
        self.wfile.write(b'hello\n')

    def do_HEAD(self):
        self.send_response(200)
        self.send_header('Content-Length', '6')
        self.end_headers()

server = HTTPServer(('127.0.0.1', 0), Handler)
with open(sys.argv[1], 'w') as f:
    f.write(str(server.server_port))
server.serve_forever()
