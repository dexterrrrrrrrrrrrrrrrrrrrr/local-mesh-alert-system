import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h1>⚠️ App Error</h1>
          <p>Something went wrong.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '12px 24px', fontSize: '1.1rem', background: '#4facfe', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', margin: '1rem' }}
          >
            🔄 Refresh App
          </button>
          <details>
            <summary>Details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
