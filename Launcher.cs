using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace EscopoV3Launcher
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string unpackedExe = Path.Combine(baseDir, "release", "win-unpacked", "EscopoV3.exe");
                string installedExe = @"C:\EscopoV3\EscopoV3.exe";

                string targetExe = null;
                if (File.Exists(unpackedExe))
                {
                    targetExe = unpackedExe;
                }
                else if (File.Exists(installedExe))
                {
                    targetExe = installedExe;
                }

                if (!string.IsNullOrEmpty(targetExe))
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = targetExe,
                        Arguments = string.Join(" ", args),
                        WorkingDirectory = Path.GetDirectoryName(targetExe),
                        UseShellExecute = true
                    };
                    Process.Start(psi);
                    return;
                }

                // Caso os binarios nao estejam presentes, sugere o instalador
                string setupExe = Path.Combine(baseDir, "Setup_EscopoV3.exe");
                if (File.Exists(setupExe))
                {
                    DialogResult res = MessageBox.Show(
                        "O pacote do EscopoV3 está pronto para instalação.\nDeseja iniciar o instalador agora?",
                        "EscopoV3",
                        MessageBoxButtons.YesNo,
                        MessageBoxIcon.Information
                    );
                    if (res == DialogResult.Yes)
                    {
                        Process.Start(setupExe);
                    }
                    return;
                }

                MessageBox.Show(
                    "Não foi possível localizar o executável do EscopoV3 em:\n" + unpackedExe + "\nou em " + installedExe,
                    "Erro ao Iniciar EscopoV3",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro ao iniciar o EscopoV3:\n" + ex.Message, "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
