using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Windows.Automation;
using VoiceFlow.Windows;
using VoiceFlow.Windows.Dictation;
using VoiceFlow.Windows.Native;
using static VoiceFlow.Windows.Native.NativeMethods;

namespace IslandFusionNative;
internal static partial class Program
{
    sealed record AgentControl(AutomationElement Element, string Name, string Runtime, int Process, System.Windows.Rect Bounds, string? Value);
    sealed record AgentSnapshot(string Id, IntPtr Window, DateTime At, Dictionary<string, AgentControl> Controls, Dictionary<string, IntPtr> Windows);
    static AgentSnapshot? CurrentAgentSnapshot;
    delegate bool AgentWindowCallback(IntPtr window, IntPtr data);
    [DllImport("user32.dll", EntryPoint="EnumWindows")] static extern bool AgentEnumWindows(AgentWindowCallback callback, IntPtr data);
    [DllImport("user32.dll", EntryPoint="IsWindowVisible")] static extern bool AgentVisible(IntPtr window);
    [DllImport("user32.dll", EntryPoint="GetWindowTextW", CharSet=CharSet.Unicode)] static extern int AgentWindowText(IntPtr window, StringBuilder text, int count);
    static bool AgentWindowAllowed(IntPtr window)
    {
        if (window == IntPtr.Zero) return false;
        GetWindowThreadProcessId(window, out var pid);
        if (pid == Parent || pid == Environment.ProcessId) return false;
        try {
            using var process = Process.GetProcessById((int)pid);
            var name = process.ProcessName.ToLowerInvariant();
            // No shell execution or automation of credential/security applications.
            return !new[] { "cmd", "powershell", "pwsh", "windowsterminal", "conhost", "mintty", "wezterm-gui", "alacritty", "code", "code - insiders", "credentialuibroker", "consent", "keepass", "keepassxc", "1password", "bitwarden", "lastpass" }.Contains(name)
                && !name.StartsWith("agent notch") && name != "electron";
        } catch { return false; }
    }
    static string AgentRuntime(AutomationElement element) => string.Join(".", element.GetRuntimeId());
    static string? AgentValue(AutomationElement element) {
        if (element.Current.IsPassword) return null;
        if (element.TryGetCurrentPattern(ValuePattern.Pattern, out var value)) return ((ValuePattern)value).Current.Value;
        if (element.Current.ControlType == ControlType.Edit && element.TryGetCurrentPattern(TextPattern.Pattern, out var text)) return ((TextPattern)text).DocumentRange.GetText(12001);
        return null;
    }
    static async Task<object> AgentObserve()
    {
        CurrentAgentSnapshot = null;
        var foreground = GetForegroundWindow();
        var window = AgentWindowAllowed(foreground) ? foreground : LastExternal;
        var operation = Task.Run<(AgentSnapshot snapshot, object response)>(() => {
            var windows = new List<object>(); var handles = new Dictionary<string, IntPtr>();
            // Native titles avoid querying UI Automation providers in unrelated/hung apps.
            AgentEnumWindows((handle, _) => { try {
                if (!AgentVisible(handle) || !AgentWindowAllowed(handle)) return true;
                var text = new StringBuilder(161); AgentWindowText(handle, text, text.Capacity);
                if (string.IsNullOrWhiteSpace(text.ToString())) return true;
                var key = "window-" + handle.ToInt64(); handles[key] = handle;
                windows.Add(new { id = key, title = text.ToString() });
            } catch { } return windows.Count < 30; }, IntPtr.Zero);
            var id = Guid.NewGuid().ToString("N"); var controls = new List<object>(); var stored = new Dictionary<string, AgentControl>();
            string title = "", app = "";
            if (AgentWindowAllowed(window)) {
                var root = AutomationElement.FromHandle(window); title = root.Current.Name;
                GetWindowThreadProcessId(window, out var pid); using var process = Process.GetProcessById((int)pid); app = process.ProcessName;
                var queue = new Queue<AutomationElement>(); queue.Enqueue(root); int scanned = 0; var budget = Stopwatch.StartNew();
                while (queue.Count > 0 && scanned++ < 2000 && controls.Count < 140 && budget.ElapsedMilliseconds < 3500) {
                    var element = queue.Dequeue(); try {
                        var c = element.Current;
                        // Password subtrees are never inspected, including their labels/values.
                        if (c.IsPassword) continue;
                        var child = TreeWalker.ControlViewWalker.GetFirstChild(element);
                        for (int n = 0; child != null && n < 300 && budget.ElapsedMilliseconds < 3500; n++) { queue.Enqueue(child); child = TreeWalker.ControlViewWalker.GetNextSibling(child); }
                        if (c.IsOffscreen || !c.IsEnabled || c.BoundingRectangle.IsEmpty) continue;
                        bool editable = c.ControlType == ControlType.Edit || element.TryGetCurrentPattern(ValuePattern.Pattern, out var vp) && !((ValuePattern)vp).Current.IsReadOnly;
                        var name = c.Name ?? ""; bool interactive = editable || c.IsKeyboardFocusable || element.TryGetCurrentPattern(InvokePattern.Pattern, out _) || element.TryGetCurrentPattern(ScrollPattern.Pattern, out _);
                        if (string.IsNullOrWhiteSpace(name) && !interactive) continue;
                        var key = "control-" + controls.Count; var bounds = c.BoundingRectangle;
                        string? originalValue = editable ? AgentValue(element) : null;
                        var value = originalValue == null ? "" : originalValue[..Math.Min(12000, originalValue.Length)];
                        stored[key] = new AgentControl(element, name, AgentRuntime(element), c.ProcessId, bounds, originalValue);
                        controls.Add(new { id = key, name = name[..Math.Min(500, name.Length)], role = c.ControlType.ProgrammaticName.Replace("ControlType.", ""), editable, focused = c.HasKeyboardFocus, scrollable = element.TryGetCurrentPattern(ScrollPattern.Pattern, out _), value, truncated = originalValue?.Length > 12000 });
                    } catch { }
                }
            }
            var snapshot = new AgentSnapshot(id, window, DateTime.UtcNow, stored, handles);
            return (snapshot, new { id, app, title = title[..Math.Min(200, title.Length)], windows, controls, warnings = controls.Count == 0 ? new[] { "No accessible controls in this window. Choose another window or let the user sign in/open the app." } : Array.Empty<string>() });
        });
        if (await Task.WhenAny(operation, Task.Delay(6000)) != operation) throw new Exception("Windows control inspection timed out. No action was taken.");
        var result = await operation; CurrentAgentSnapshot = result.snapshot; return result.response;
    }
    static AgentSnapshot AgentFresh(JsonElement value)
    {
        var snapshot = CurrentAgentSnapshot;
        if (snapshot == null || snapshot.Id != S(value, "snapshot") || DateTime.UtcNow - snapshot.At > TimeSpan.FromSeconds(90)) throw new Exception("Windows view expired. Inspect again before acting.");
        return snapshot;
    }
    static async Task<object> AgentFocus(JsonElement value)
    {
        var snapshot = AgentFresh(value);
        if (!snapshot.Windows.TryGetValue(S(value, "window"), out var handle) || !AgentWindowAllowed(handle)) throw new Exception("Choose a visible application window from the latest inspection.");
        var root = AutomationElement.FromHandle(handle);
        if (root.TryGetCurrentPattern(WindowPattern.Pattern, out var pattern) && ((WindowPattern)pattern).Current.WindowVisualState == WindowVisualState.Minimized) ((WindowPattern)pattern).SetWindowVisualState(WindowVisualState.Normal);
        try { root.SetFocus(); } catch (InvalidOperationException) { }
        await TextInserter.RefocusAsync(handle);
        if (GetForegroundWindow() != handle) throw new Exception("Windows could not focus the requested application.");
        LastExternal = handle; CurrentAgentSnapshot = null; return new { focused = true };
    }
    static async Task<object> AgentAct(JsonElement value)
    {
        var snapshot = AgentFresh(value);
        if (!snapshot.Controls.TryGetValue(S(value, "target"), out var target) || !AgentWindowAllowed(snapshot.Window)) throw new Exception("This Windows target is unavailable. Inspect again.");
        var front = GetForegroundWindow(); GetWindowThreadProcessId(front, out var frontPid);
        if (front != snapshot.Window && frontPid != Parent) throw new Exception("The foreground app changed. Inspect again before acting.");
        var element = target.Element; var c = element.Current;
        if (c.IsPassword || c.IsOffscreen || !c.IsEnabled || c.ProcessId != target.Process || AgentRuntime(element) != target.Runtime || c.Name != target.Name || c.BoundingRectangle != target.Bounds) throw new Exception("The control moved or changed. Inspect again before acting.");
        foreach (var field in snapshot.Controls.Values.Where(x => x.Value != null)) {
            if (AgentValue(field.Element) != field.Value) throw new Exception("A field was edited after inspection. Inspect and review again before acting.");
        }
        var op = S(value, "op");
        if (op is not ("click" or "type" or "press" or "scroll")) throw new Exception("Unsupported Windows action.");
        await TextInserter.RefocusAsync(snapshot.Window);
        if (GetForegroundWindow() != snapshot.Window) throw new Exception("The target app could not be focused. No input was sent.");
        CurrentAgentSnapshot = null; // Every action consumes its snapshot, including unsuccessful attempts.
        if (op == "click") {
            if (element.TryGetCurrentPattern(InvokePattern.Pattern, out var invoke)) ((InvokePattern)invoke).Invoke();
            else if (element.TryGetCurrentPattern(SelectionItemPattern.Pattern, out var select)) ((SelectionItemPattern)select).Select();
            else if (element.TryGetCurrentPattern(TogglePattern.Pattern, out var toggle)) ((TogglePattern)toggle).Toggle();
            else if (element.TryGetCurrentPattern(ExpandCollapsePattern.Pattern, out var expand)) ((ExpandCollapsePattern)expand).Expand();
            else { var r = element.Current.BoundingRectangle; var point = new Point((int)(r.X + r.Width / 2), (int)(r.Y + r.Height / 2)); var hit = AutomationElement.FromPoint(new System.Windows.Point(point.X, point.Y)); if (AgentRuntime(hit) != target.Runtime) throw new Exception("The target is covered by another control. No click was sent."); ClickAt(JsonSerializer.SerializeToElement(new { x = point.X, y = point.Y })); }
        } else if (op == "scroll") {
            if (!element.TryGetCurrentPattern(ScrollPattern.Pattern, out var scroll)) throw new Exception("This control does not support scrolling. Choose its scrollable parent.");
            var direction = S(value, "direction"); if (direction is not ("up" or "down")) throw new Exception("Choose up or down.");
            ((ScrollPattern)scroll).Scroll(ScrollAmount.NoAmount, direction == "down" ? ScrollAmount.LargeIncrement : ScrollAmount.LargeDecrement);
        } else {
            element.SetFocus();
            var focused = AutomationElement.FocusedElement;
            for (int attempt = 0; attempt < 15 && AgentRuntime(focused) != target.Runtime; attempt++) { await Task.Delay(20); focused = AutomationElement.FocusedElement; }
            if (GetForegroundWindow() != snapshot.Window) throw new Exception("The foreground app changed. No keyboard input was sent.");
            if (focused.Current.IsPassword || AgentRuntime(focused) != target.Runtime) throw new Exception("The input field changed. No keyboard input was sent.");
            if (op == "type") {
                var text = S(value, "text"); if (text.Length == 0 || text.Length > 12000) throw new Exception("Enter up to 12,000 characters.");
                if (element.TryGetCurrentPattern(ValuePattern.Pattern, out var pattern) && !((ValuePattern)pattern).Current.IsReadOnly) ((ValuePattern)pattern).SetValue(text);
                else {
                    if (c.ControlType != ControlType.Edit) throw new Exception("This is not an editable field.");
                    SendKeys.SendWait("^a");
                    var outcome = await Inserter.InsertAsync(text, FocusInfo.Describe(snapshot.Window));
                    if (outcome.ToString() != "Pasted") throw new Exception("Typing was not completed: " + outcome + ". The task will not submit it.");
                }
            } else {
                var keys = new Dictionary<string, string> { ["enter"]="{ENTER}", ["tab"]="{TAB}", ["escape"]="{ESC}", ["find"]="^f", ["select all"]="^a", ["save"]="^s", ["next tab"]="^{TAB}", ["previous tab"]="^+{TAB}", ["back"]="%{LEFT}", ["address bar"]="^l", ["home"]="{HOME}", ["end"]="{END}", ["page down"]="{PGDN}", ["page up"]="{PGUP}" };
                if (!keys.TryGetValue(S(value, "keys"), out var chord)) throw new Exception("Unsupported keyboard action."); SendKeys.SendWait(chord);
            }
        }
        return new { applied = true, operation = op, target = target.Name };
    }
}
