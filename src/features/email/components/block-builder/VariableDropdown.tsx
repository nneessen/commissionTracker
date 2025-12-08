import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Variable } from 'lucide-react'
import { EMAIL_TEMPLATE_VARIABLES } from '@/types/email.types'

interface VariableDropdownProps {
  onInsert: (variable: string) => void
  disabled?: boolean
}

export function VariableDropdown({ onInsert, disabled }: VariableDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="h-7 gap-1.5">
          <Variable className="h-3.5 w-3.5" />
          <span className="text-xs">Insert Variable</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {EMAIL_TEMPLATE_VARIABLES.map((variable) => (
          <DropdownMenuItem
            key={variable.name}
            onClick={() => onInsert(`{{${variable.name}}}`)}
            className="flex-col items-start"
          >
            <span className="font-mono text-xs text-primary">
              {`{{${variable.name}}}`}
            </span>
            <span className="text-xs text-muted-foreground">
              {variable.description}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
