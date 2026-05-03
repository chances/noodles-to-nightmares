# Notes

## Sanny Builder

- Condition opcodes (e.g. `Pickup.HasBeenCollected`) cannot be assigned to a
  variable directly. Use an `if` block instead:
  ```
  // ❌ $collected = Pickup.HasBeenCollected($myPickup)
  // ✅
  if Pickup.HasBeenCollected($myPickup)
  then
    $collected = True
  end
  ```

### Mission Scripts

- Do NOT use script_name, it crashes GTA 3 1.0 with III.VC.CLEO v2.1

## Blender

- [How to Combine Objects](https://www.youtube.com/watch?v=Ek6W18dZFLI)
  (YouTube)
