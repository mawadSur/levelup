import type { TopPromptItem } from '@levelup/types';
import { Card, CardContent, CardHeader, CardTitle } from '@levelup/ui';
import { Badge } from '@levelup/ui';

interface TopPromptsCardProps {
  prompts: TopPromptItem[];
}

export function TopPromptsCard({ prompts }: TopPromptsCardProps) {
  if (prompts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Top Cloned Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No clone activity yet this period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Top Cloned Prompts</CardTitle>
        <p className="text-xs text-muted-foreground">
          Most-reused prompts by your team this period.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2 hidden sm:table-cell">Category</th>
                <th className="px-4 py-2 hidden md:table-cell">Author</th>
                <th className="px-4 py-2 hidden lg:table-cell">Department</th>
                <th className="px-4 py-2 text-right">Clones</th>
              </tr>
            </thead>
            <tbody>
              {prompts.map((prompt, idx) => (
                <tr
                  key={prompt.promptId}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{idx + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate max-w-[200px]" title={prompt.title}>
                        {prompt.title}
                      </span>
                      {prompt.isShared && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Shared
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <span className="capitalize text-muted-foreground">{prompt.category}</span>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">
                    {prompt.authorName}
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground">
                    {prompt.departmentName ?? <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="font-semibold tabular-nums text-primary">
                      {prompt.cloneCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
