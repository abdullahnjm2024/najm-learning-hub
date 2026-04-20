import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
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

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary] caught:", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background px-6 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-3xl">
            ⚠️
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground mb-2">
              حدث خطأ غير متوقع
            </h1>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              يرجى إعادة تحميل الصفحة. إذا استمرت المشكلة، تواصل مع الدعم الفني.
            </p>
            {this.state.error && (
              <pre className="mt-4 text-left text-xs bg-muted text-destructive rounded-lg p-3 max-w-sm overflow-auto">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <button
            onClick={this.handleReload}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all"
          >
            إعادة التحميل
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
