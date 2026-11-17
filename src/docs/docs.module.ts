import { Controller, Get, Header, Module, NotFoundException } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SPEC_PATH = join(process.cwd(), 'openapi.yaml');

const PAGE = `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ДомТех API</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css">
</head>
<body>
<div id="ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/api/docs/openapi.yaml', dom_id: '#ui', withCredentials: true });</script>
</body>
</html>`;

@Controller('docs')
export class DocsController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  page() {
    return PAGE;
  }

  @Get('openapi.yaml')
  @Header('Content-Type', 'application/yaml; charset=utf-8')
  spec() {
    if (!existsSync(SPEC_PATH)) throw new NotFoundException();
    return readFileSync(SPEC_PATH, 'utf8');
  }
}

@Module({ controllers: [DocsController] })
export class DocsModule {}
