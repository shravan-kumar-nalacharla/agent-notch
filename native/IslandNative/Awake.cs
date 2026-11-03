using System.Runtime.InteropServices;
using System.Text.Json;
namespace IslandFusionNative;
internal static partial class Program
{
    [DllImport("kernel32.dll", SetLastError=true)] static extern uint SetThreadExecutionState(uint flags);
    static long AwakeDeadline;
    static void StopAwake(){if(AwakeDeadline==0)return;SetThreadExecutionState(0x80000000);AwakeDeadline=0;}
    static object AwakeState(JsonElement value)
    {
        if(value.ValueKind==JsonValueKind.Object&&value.TryGetProperty("enabled",out _)){
            if(B(value,"enabled")){
                var minutes=N(value,"minutes");if(minutes is not (15 or 30 or 60 or 120))throw new Exception("Invalid Keep Awake duration.");
                if(SetThreadExecutionState(0x80000003)==0)throw new Exception("Windows could not enable Keep Awake.");
                AwakeDeadline=Environment.TickCount64+(long)(minutes*60000);
            }else StopAwake();
        }
        if(AwakeDeadline>0&&Environment.TickCount64>=AwakeDeadline)StopAwake();
        return new{enabled=AwakeDeadline>0,remainingSeconds=Math.Max(0,(AwakeDeadline-Environment.TickCount64)/1000),supported=true};
    }
}
