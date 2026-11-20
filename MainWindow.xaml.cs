using System.IO;
using System.Windows;

namespace FirstAimadeweatherapp;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        Loaded += MainWindow_Loaded;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        try
        {
            await WeatherView.EnsureCoreWebView2Async();
            WeatherView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            WeatherView.Source = new Uri(Path.Combine(AppContext.BaseDirectory, "wwwroot", "index.html"));
        }
        catch (Exception exception)
        {
            MessageBox.Show(
                $"Weather couldn't start. Make sure the Microsoft Edge WebView2 Runtime is installed.\n\n{exception.Message}",
                "Weather startup error",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
            Close();
        }
    }
}