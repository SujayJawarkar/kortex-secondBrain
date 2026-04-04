import { Link } from "react-router-dom";
import { Telescope } from "lucide-react";
import { Button } from "../components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-20 h-20 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-6">
        <Telescope className="w-10 h-10" />
      </div>
      <h1 className="text-3xl font-bold mb-2">404 - Page Not Found</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-sm">
        Oops! We couldn't find the page you're searching for. It might have been moved or deleted.
      </p>
      
      <Link to="/">
        <Button className="h-11 px-8 bg-brand hover:opacity-90 transition-opacity text-white font-medium rounded-full shadow-sm">
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}
