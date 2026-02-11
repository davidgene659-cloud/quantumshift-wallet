import * as React from "react"
import { Check } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

const MobileSelect = React.forwardRef(({ 
  value, 
  onValueChange, 
  children, 
  options = [],
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

  // Support both children-based and options-based API
  const items = options.length > 0 
    ? options 
    : React.Children.toArray(children).filter(
        child => child.type?.displayName === 'SelectItem'
      ).map(child => ({ value: child.props.value, label: child.props.children }))

  const selectedItem = items.find(item => item.value === value)

  if (!isMobile && children) {
    return <div ref={ref} {...props}>{children}</div>
  }

  return (
    <>
      <button
        ref={ref}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 select-none",
          className
        )}
        {...props}
      >
        <span>{selectedItem?.label || placeholder}</span>
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
                key={item.value}
                onClick={() => {
                  onValueChange(item.value)
                  setOpen(false)
                }}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg transition-colors select-none",
                  value === item.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
                style={{ minHeight: '44px' }}
              >
                <span>{item.label}</span>
                {value === item.value && <Check className="w-4 h-4" />}
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