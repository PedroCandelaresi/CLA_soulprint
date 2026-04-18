// Node fetch removed, using native http module below.

const ADMIN_API = 'http://localhost:3001/admin-api';

async function query(q, variables = {}, token = '') {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(ADMIN_API, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: q, variables }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    if (json.data && json.data.errors) throw new Error(JSON.stringify(json.data.errors));
    return json.data;
}

async function main() {
    console.log('Logging in...');
    const loginData = await query(`
    mutation {
      login(username: "superadmin", password: "superadmin") {
        ... on CurrentUser { id }
        ... on InvalidCredentialsError { message }
      }
    }
  `);

    // Usually token is cookie, but for Admin API usually we need correct headers.
    // Wait, Vendure Admin API relies on Cookies or Bearer?
    // Our config says: tokenMethod: ['bearer', 'cookie'].
    // But the login mutation response usually returns ANY token?
    // Wait, standard Vendure login relies on cookie 'session-token'.
    // Node-fetch doesn't save cookies automatically.
    // I need to extract 'set-cookie' header.

    // Let's retry with credentials grabbing.
}

// Rewriting for Cookie handling
const http = require('http');

function post(body, token = null) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: 'localhost',
            port: 3001,
            path: '/admin-api',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        if (token) opts.headers['Authorization'] = `Bearer ${token}`; // Use Bearer

        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                // Check formatting
                try {
                    const json = JSON.parse(data);
                    // Extract token from header if logging in
                    let authToken = res.headers['vendure-auth-token'];
                    // ... cookie fallback if needed ...
                    resolve({ json, authToken });
                } catch (e) { reject(e); }
            });
        });
        console.log('Request Body:', body);
        req.write(body);
        req.end();
    });
}

(async () => {
    try {
        console.log('1. Logging in...');
        const loginBody = JSON.stringify({
            query: 'mutation { login(username: "superadmin", password: "superadmin") { ... on CurrentUser { id } } }'
        });
        const { json: loginRes, authToken } = await post(loginBody);
        console.log('Login Response:', JSON.stringify(loginRes));

        // Need token. In default Vendure, it uses session-token cookie.
        // If result has ID, success.
        if (!loginRes.data.login.id) throw new Error('Login failed');

        const token = authToken;
        console.log('Token:', token);

        console.log('2. Fetching Products...');
        const prodBody = JSON.stringify({
            query: `query {
              products {
                  items {
                      id
                      name
                      variants {
                          id
                      }
                  }
              }
          }`
        });
        const { json: prodRes } = await post(prodBody, token);
        console.log('Products Response:', JSON.stringify(prodRes));
        if (!prodRes.data || !prodRes.data.products) throw new Error('Failed to fetch products');
        const products = prodRes.data.products.items;
        console.log('Found products:', products.length);

        const variantsToUpdate = [];
        products.forEach(p => {
            console.log(`Product ${p.name} (ID: ${p.id})`);
            p.variants.forEach(v => {
                console.log(` - Variant ID: ${v.id}. Updating price...`);
                variantsToUpdate.push({ id: v.id, price: 15000 }); // $150.00
            });
        });

        if (variantsToUpdate.length > 0) {
            console.log('3. Updating prices for:', variantsToUpdate);
            const updateBody = JSON.stringify({
                query: `mutation UpdatePrices($input: [UpdateProductVariantInput!]!) {
                  updateProductVariants(input: $input) {
                      ... on ProductVariant { id price }
                  }
              }`,
                variables: { input: variantsToUpdate }
            });
            const { json: updateRes } = await post(updateBody, token);
            console.log('Update Result:', JSON.stringify(updateRes));
        } else {
            console.log('All variants already have prices.');
        }

    } catch (e) {
        console.error(e);
    }
})();
