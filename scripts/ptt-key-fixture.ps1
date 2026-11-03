Add-Type -ReferencedAssemblies System.Windows.Forms,System.Drawing -TypeDefinition @'
using System;
using System.Threading;
using System.Runtime.InteropServices;
using System.Windows.Forms;
public static class NotchKeyFixture {
 [DllImport("user32.dll")]static extern void keybd_event(byte vk,byte scan,uint flags,UIntPtr extra);
 static void Key(byte vk,bool down){keybd_event(vk,0,down?0u:2u,UIntPtr.Zero);}
 public static void Run(){int leaked=0;var form=new Form{Text="Agent Notch PTT test fixture",Width=350,Height=120,KeyPreview=true};form.Controls.Add(new TextBox{Dock=DockStyle.Fill,Multiline=true,Text="Local keyboard test. No cloud audio."});form.KeyDown+=(s,e)=>{if(e.KeyCode==Keys.V)Interlocked.Increment(ref leaked);};form.Shown+=(s,e)=>{new Thread(()=>{Thread.Sleep(300);try{Key(0x11,true);Key(0x12,true);Key(0x56,true);Console.WriteLine("HELD");Console.In.ReadLine();}finally{Key(0x56,false);Key(0x12,false);Key(0x11,false);Thread.Sleep(200);Console.WriteLine("LEAKED="+leaked);form.BeginInvoke(new Action(()=>form.Close()));}}){IsBackground=true}.Start();};Application.Run(form);}
}
'@
[NotchKeyFixture]::Run()
