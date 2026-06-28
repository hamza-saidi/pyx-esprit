/**
 * utils/swagger.js
 *
 * Zero-dependency interactive Swagger UI API documentation.
 * Serves OpenAPI 3.0.0 specification using official Swagger UI CDN files.
 */

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Golf Huub Marketing API',
    version: '1.0.0',
    description: 'API documentation for the Golf Huub marketing automation platform.',
  },
  servers: [
    {
      url: '/api',
      description: 'Local development server',
    },
  ],
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register a new employee/admin account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nom: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  mot_de_passe: { type: 'string', minLength: 8 },
                  role: { type: 'string', enum: ['admin', 'employee'] },
                },
                required: ['nom', 'email', 'mot_de_passe'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Created successfully' },
          400: { description: 'Invalid input or email already exists' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate user credentials',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  mot_de_passe: { type: 'string' },
                },
                required: ['email', 'mot_de_passe'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated successfully' },
          202: { description: 'MFA required for admin role' },
          400: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/verify-mfa': {
      post: {
        summary: 'Verify MFA code for admin accounts',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  pending_token: { type: 'string' },
                  code: { type: 'string', length: 6 },
                },
                required: ['pending_token', 'code'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Verified and tokens generated' },
          400: { description: 'Invalid or expired code' },
        },
      },
    },
    '/contacts': {
      get: {
        summary: 'Get list of contacts (paginated, filterable)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'List of contacts returned' },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        summary: 'Create a new contact',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  prenom: { type: 'string' },
                  nom: { type: 'string' },
                  email: { type: 'string' },
                  sexe: { type: 'string', enum: ['Homme', 'Femme', 'Autre'] },
                  handicap: { type: 'number' },
                },
                required: ['prenom', 'nom', 'email'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Created' },
          401: { description: 'Unauthorized' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

/**
 * Returns the interactive Swagger UI HTML page.
 */
function getSwaggerHtml() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Golf Huub API Documentation</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
      <style>
        html { box-sizing: border-box; overflow: -merge-y; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin: 0; background: #fafafa; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            spec: ${JSON.stringify(openApiSpec)},
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            layout: "BaseLayout"
          });
        };
      </script>
    </body>
    </html>
  `;
}

module.exports = { getSwaggerHtml, openApiSpec };
