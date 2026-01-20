import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-dark/50 backdrop-blur-md rounded-xl border border-red-500/20">
                    <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
                    <h2 className="text-2xl font-medieval text-white mb-2">The Citadel has crumbled</h2>
                    <p className="text-gray-400 mb-6 max-w-md">
                        A rift in the source code has been detected. The scribes have been notified.
                    </p>
                    <div className="bg-black/40 p-4 rounded-lg mb-6 max-w-lg overflow-auto text-left border border-white/5">
                        <code className="text-red-400 text-xs font-mono">
                            {this.state.error?.toString()}
                        </code>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn-primary flex items-center gap-2"
                    >
                        <RefreshCw size={18} />
                        Reconstruct Realm
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
