using System.Windows.Forms;
internal static class Program {
 [STAThread] static void Main() {
  Application.SetHighDpiMode(HighDpiMode.PerMonitorV2); Application.EnableVisualStyles();
  using var form=new Form { Text="Agent Notch Windows Task Fixture", Width=460, Height=300, StartPosition=FormStartPosition.CenterScreen };
  var message=new TextBox { AccessibleName="Message", Name="Message", Left=25, Top=35, Width=300 };
  var secret=new TextBox { AccessibleName="Secret", Name="Secret", UseSystemPasswordChar=true, Text="fixture-password-must-not-leak", Left=25, Top=75, Width=300 };
  var status=new Label { AccessibleName="Nothing sent yet", Text="Nothing sent yet", Left=25, Top=165, Width=380, Height=35 };
  var send=new Button { AccessibleName="Send", Text="Send", Left=25, Top=115, Width=100 };
  using var editTimer=new System.Windows.Forms.Timer { Interval=1000 };
  message.TextChanged+=(_,_)=>{if(message.Text=="change-later")editTimer.Start();};
  editTimer.Tick+=(_,_)=>{editTimer.Stop();message.Text="edited-draft";};
  send.Click+=(_,_)=>{ status.Text="Sent: "+message.Text; status.AccessibleName=status.Text; };
  form.Controls.AddRange([message,secret,send,status]); form.Shown+=(_,_)=>{form.Activate();message.Focus();};
  Application.Run(form);
 }
}
