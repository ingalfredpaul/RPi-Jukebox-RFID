import { Component, type ReactNode, type ErrorInfo } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className={styles.container}>
          <div className={styles.content}>
            <span className={styles.icon}>!</span>
            <h2 className={styles.title}>Etwas ist schiefgelaufen</h2>
            <p className={styles.message}>
              {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
            </p>
            <button className={styles.button} onClick={this.handleReset}>
              Erneut versuchen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
