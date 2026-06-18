import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { initializeStore } from './state/store';
import './index.css';

function bootstrap() {
  initializeStore();
  const root = document.getElementById('root');
  if (root) {
    ReactDOM.createRoot(root).render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
  }
}

bootstrap();