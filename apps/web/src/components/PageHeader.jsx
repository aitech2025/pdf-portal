
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const PageHeader = ({ title, description, breadcrumbs, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center text-sm text-muted-foreground mb-3 font-medium">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="w-4 h-4 mx-1.5 opacity-50" />}
                {crumb.path ? (
                  <Link to={crumb.path} className="hover:text-primary transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">{title}</h1>
        {description && <p className="text-muted-foreground mt-2 text-lg max-w-[65ch]">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
};

export default PageHeader;
