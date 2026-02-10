import * as React from "react"
import { Check } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

const MobileSelect = React.forwardRef(({ 
  value, 
  onValueChange, 
  children, 
  placeholder = "Select...",
  className,
  ...props 
}, ref) => {
  const [open, setOpen] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const items = React.Children.toArray(children).filter(
    child => child.type?.displayName === 'SelectItem'
  )

  const selectedItem = items.find(item => item.props.value === value)

  if (!isMobile) {
    return <div ref={ref} {...props}>{children}</div>
  }

  return (
    <>
      <button
        ref={ref}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        <span>{selectedItem?.props.children || placeholder}</span>
        <span className="text-muted-foreground">▼</span>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{placeholder}</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.props.value}
                onClick={() => {
                  onValueChange(item.props.value)
                  setOpen(false)
                }}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg transition-colors",
                  value === item.props.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <span>{item.props.children}</span>
                {value === item.props.value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
})

MobileSelect.displayName = "MobileSelect"

const SelectItem = ({ value, children }) => null
SelectItem.displayName = "SelectItem"

export { MobileSelect, SelectItem }