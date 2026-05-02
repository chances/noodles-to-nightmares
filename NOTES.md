# Notes

## Sanny Builder

- Condition opcodes (e.g. `Pickup.HasBeenCollected`) cannot be assigned to a variable directly. Use an `if` block instead:
  ```
  // ❌ $collected = Pickup.HasBeenCollected($myPickup)
  // ✅
  if Pickup.HasBeenCollected($myPickup)
  then
    $collected = True
  end
  ```

## Blender

- [How to Combine Objects](https://www.youtube.com/watch?v=Ek6W18dZFLI)
  (YouTube)
