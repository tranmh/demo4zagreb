import { greet } from './greeting.js';

const app = document.getElementById('app');
app.innerHTML = `
  <h1>${greet('World')}</h1>
  <p>Welcome to demo4zagreb</p>
`;
