import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1A2E] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none shadow-sm",
          {
            "bg-gradient-to-r from-[#6A5ACD] to-[#7B68EE] text-white hover:from-[#5A4ABD] hover:to-[#6B58DE] hover:shadow-lg hover:shadow-purple-500/30 active:scale-[0.98]": variant === "default",
            "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 hover:shadow-lg hover:shadow-red-500/30 active:scale-[0.98]": variant === "destructive",
            "border-2 border-purple-500/50 bg-[#1A1A2E]/50 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400 hover:text-purple-200 hover:shadow-md hover:shadow-purple-500/20 active:scale-[0.98] backdrop-blur-sm": variant === "outline",
            "bg-[#2A2A3E] text-gray-200 hover:bg-[#3A3A4E] hover:text-white active:scale-[0.98]": variant === "secondary",
            "text-gray-300 hover:bg-[#2A2A3E] hover:text-white active:scale-[0.98]": variant === "ghost",
            "h-10 px-4 py-2 text-sm": size === "default",
            "h-9 px-3 text-xs": size === "sm",
            "h-12 px-8 text-base": size === "lg",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }

