import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit2, Check, X } from "lucide-react";

export function EditableBio({ value, onSave, placeholder }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setIsEditing(false);
  };

  const displayValue = value || placeholder;

  return (
    <div className="relative group">
      {/* Display Mode */}
      <div className="min-h-[120px] p-6 rounded-lg border border-border/30 bg-linear-to-r from-muted/20 to-muted/5 hover:from-muted/30 hover:to-muted/10 transition-all duration-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={`text-foreground leading-relaxed ${!value ? 'text-muted-foreground italic' : ''}`}>
              {displayValue}
            </p>
          </div>
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-4 h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Edit About Me</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={placeholder}
                  className="min-h-[200px] resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                    <Check className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}