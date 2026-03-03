import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
} from "@angular/core";
import {
  trigger,
  transition,
  style,
  animate,
  state,
} from "@angular/animations";
import { Router } from "@angular/router";
import {
  IonModal,
  LoadingController,
  Platform,
  ToastController,
} from "@ionic/angular";
import {
  catchError,
  throwError,
  tap,
  timeout,
  interval,
  Subscription,
} from "rxjs";
import { Alert } from "../class/alert";
import { user } from "../class/user";
import { AuthService } from "../services/auth.service";
import { MovimentoService } from "../services/movimento.service";
import * as CryptoJS from "crypto-js";
import { SwUpdate, VersionEvent } from "@angular/service-worker";
import { WebsocketService } from "../services/websocket.service";
import { DataloadService } from "../services/dataload.service";

export let browserRefresh = true;

@Component({
  selector: "app-login",
  templateUrl: "./login.page.html",
  styleUrls: ["./login.page.scss"],
  standalone: false,
  animations: [
    trigger("logoFloat", [
      state("loaded", style({ opacity: 1, transform: "translateY(0)" })),
      transition(":enter", [
        style({ opacity: 0, transform: "translateY(-50px)" }),
        animate("800ms ease-out"),
      ]),
    ]),
    trigger("titleAnimation", [
      state("loaded", style({ opacity: 1, transform: "translateY(0)" })),
      transition(":enter", [
        style({ opacity: 0, transform: "translateY(-50px)" }),
        animate("800ms ease-out"),
      ]),
    ]),
    trigger("formSlide", [
      state("visible", style({ opacity: 1, transform: "translateY(0)" })),
      transition(":enter", [
        style({ opacity: 0, transform: "translateY(50px)" }),
        animate("600ms 300ms ease-out"),
      ]),
    ]),
    trigger("fadeInOut", [
      transition(":enter", [
        style({ opacity: 0 }),
        animate("300ms ease-in", style({ opacity: 1 })),
      ]),
      transition(":leave", [animate("300ms ease-out", style({ opacity: 0 }))]),
    ]),
    trigger("slideUp", [
      transition(":enter", [
        style({ opacity: 0, transform: "translateY(30px)" }),
        animate(
          "500ms 500ms ease-out",
          style({ opacity: 1, transform: "translateY(0)" }),
        ),
      ]),
    ]),
    trigger("buttonShake", [
      state("error", style({ transform: "translateX(0)" })),
      transition("* => error", [
        animate("200ms ease-in-out", style({ transform: "translateX(-10px)" })),
        animate("200ms ease-in-out", style({ transform: "translateX(10px)" })),
        animate("200ms ease-in-out", style({ transform: "translateX(-5px)" })),
        animate("200ms ease-in-out", style({ transform: "translateX(5px)" })),
        animate("200ms ease-in-out", style({ transform: "translateX(0)" })),
      ]),
    ]),
    trigger("successAnimation", [
      transition(":enter", [
        style({ transform: "scale(0.8)", opacity: 0 }),
        animate("400ms ease-out", style({ transform: "scale(1)", opacity: 1 })),
      ]),
    ]),
  ],
})
export class LoginPage implements OnInit, AfterViewInit {
  @ViewChild("particlesCanvas") particlesCanvas!: ElementRef;

  isStandaloneMode: boolean;
  author = "Digital RF";
  site = "https://digitalrf.com.br";
  deferredPrompt: any;
  @ViewChild(IonModal) modal: IonModal;

  public user: user = new user();
  public senha: string = "";
  private subscriptions = new Subscription();

  // Estados
  logoState = "initial";
  formState = "initial";
  titleState = "initial";

  // Variáveis de controle UI
  usernameFocused = false;
  passwordFocused = false;
  mostrarSenha = false; // Adicionado para compatibilidade com novo template
  showPassword = false;
  loading = false; // Adicionado para compatibilidade com novo template
  isLoading = false;
  loginProgress = 0;
  hasUpdate = false;
  connectionStatus = true;
  showStats = false;
  currentDate = new Date();
  currentVersion = "1.0.14";
  shakeButton = false;
  logoLoaded = true; // Para controlar exibição da logo vs texto
  lembrarSenha = false; // Controle do checkbox lembrar-me

  // Mensagens dinâmicas
  loginMessage: { text: string; type: "success" | "error" | "info" } | null =
    null;

  // Stats (pode vir de um serviço)
  stats = {
    users: "1.2k",
    uptime: "99.9%",
  };

  // Particulas
  private particles: any[] = [];
  private animationId: number = 0;

  constructor(
    public router: Router,
    public authservice: AuthService,
    private alert: Alert,
    private toastController: ToastController,
    private loadingCtrl: LoadingController,
    private swUpdate: SwUpdate,
    public socket: WebsocketService,
    public dataLoad: DataloadService,
    private platform: Platform,
  ) {
    this.authservice.isMobile = this.platform.is("mobile");
    this.isStandaloneMode = this.checkStandaloneMode();
  }

  @HostListener("window:beforeinstallprompt", ["$event"])
  onBeforeInstallPrompt(event: Event) {
    event.preventDefault();
    this.deferredPrompt = event;
    this.hasUpdate = true; // Mostrar badge de instalação
  }

  ngOnInit() {
    this.authservice.checkPlatform();
    this.setupEventListeners();

    // Carregar dados salvos se "lembrar-me" estava marcado
    this.carregarDadosSalvos();

    // Verificar atualizações
    this.checkForUpdates();

    // Iniciar animações
    this.initAnimations();

    // Verificar conexão
    this.checkConnection();

    // Configurar PWA
    this.setupPWA();

    if (browserRefresh === true) {
      this.authservice.destroyToken();
    }
  }

  ngAfterViewInit() {
    this.initParticles();
    this.startAmbientAnimations();
  }

  private carregarDadosSalvos(): void {
    const lembrar = window.localStorage.getItem("lembrarSenha");

    if (lembrar === "true") {
      const usuarioSalvo = window.localStorage.getItem("usuarioSalvo");
      const senhaSalva = window.localStorage.getItem("senhaSalva");

      if (usuarioSalvo && senhaSalva) {
        this.user.nom_usuario = usuarioSalvo;
        this.senha = senhaSalva;
        this.lembrarSenha = true;
      }
    }
  }

  ngOnDestroy() {
    this.cleanup();
  }

  // ============== MÉTODOS DO LOGIN COM MD5 ==============
  public async login(): Promise<void> {
    // Validar campos
    if (!this.validateLoginForm()) {
      return;
    }

    // Iniciar loading animado
    await this.startLoginAnimation();

    // Gerar hash MD5 da senha
    const senhaHash = CryptoJS.MD5(this.senha).toString().toUpperCase();

    console.log("Login attempt:", {
      usuario: this.user.nom_usuario,
      senhaHash: senhaHash.substring(0, 8) + "...", // Log parcial por segurança
    });

    // Executar login
    this.executeLogin(senhaHash);
  }

  private validateLoginForm(): boolean {
    if (!this.user.nom_usuario || !this.senha) {
      this.showMessage("Preencha todos os campos", "error");
      this.triggerShakeAnimation();
      return false;
    }

    if (this.user.nom_usuario.length < 3) {
      this.showMessage("Usuário deve ter pelo menos 3 caracteres", "error");
      return false;
    }

    if (this.senha.length < 4) {
      this.showMessage("Senha deve ter pelo menos 4 caracteres", "error");
      return false;
    }

    return true;
  }

  private async startLoginAnimation(): Promise<void> {
    this.isLoading = true;
    this.loginProgress = 0;

    // Simular progresso incremental
    const progressInterval = setInterval(() => {
      if (this.loginProgress < 90) {
        this.loginProgress += 15;
      } else {
        clearInterval(progressInterval);
      }
    }, 300);
  }

  private executeLogin(senhaHash: string): void {
    this.authservice
      .loginUser(this.user.nom_usuario, senhaHash)
      .pipe(
        timeout(11000),
        catchError((error) => {
          this.handleLoginError(error);
          return throwError(error);
        }),
        tap((data) => {
          this.handleLoginSuccess(data);
        }),
      )
      .subscribe({
        next: () => {
          this.handleLoginComplete();
        },
        error: (error) => {
          this.handleLoginError(error);
        },
      });
  }

  private handleLoginSuccess(data: any): void {
    console.log("Login response:", data);

    if (data && data.token) {
      window.localStorage.setItem("auth", data.auth);
      window.localStorage.setItem("token", data.token);

      // Adicionar informações extras ao localStorage
      window.localStorage.setItem(
        "userInfo",
        JSON.stringify({
          username: this.user.nom_usuario,
          loginTime: new Date().toISOString(),
        }),
      );

      // Salvar credenciais se "lembrar-me" estiver marcado
      if (this.lembrarSenha) {
        window.localStorage.setItem("lembrarSenha", "true");
        window.localStorage.setItem("usuarioSalvo", this.user.nom_usuario);
        window.localStorage.setItem("senhaSalva", this.senha);
      } else {
        // Limpar dados salvos se não marcar lembrar
        window.localStorage.removeItem("lembrarSenha");
        window.localStorage.removeItem("usuarioSalvo");
        window.localStorage.removeItem("senhaSalva");
      }
    }

    if (data && data.user && data.user[0]) {
      this.authservice.userLogado = data.user[0];
      this.loginProgress = 100;

      // Mostrar mensagem de sucesso
      this.showMessage("Login realizado com sucesso!", "success");

      // Atualizar cadastro de clientes em background (não bloqueia o login)
      if (this.authservice.userLogado.schema) {
        this.authservice.atualizarCadastroClientes(
          this.authservice.userLogado.schema,
        );
      }
    }
  }

  private handleLoginComplete(): void {
    this.loginProgress = 100;

    // Conectar WebSocket
    this.socket.socketCon();

    // Pequeno delay para mostrar animação de sucesso
    setTimeout(() => {
      this.loadingCtrl.dismiss().catch(() => {});
      this.isLoading = false;

      // Navegar para home
      if (this.authservice.userLogado?.schema) {
        setTimeout(() => {
          this.goToHome(this.authservice.userLogado.schema);
        }, 500);
      }
    }, 1000);
  }

  private handleLoginError(error: any): void {
    this.isLoading = false;
    this.loginProgress = 0;
    this.triggerShakeAnimation();

    const errorMessage = this.getErrorMessage(error);
    this.showMessage(errorMessage, "error");

    // Tentar fazer dismiss do loading se existir
    this.loadingCtrl.dismiss().catch(() => {});

    // Mostrar toast com alert service
    this.alert.presentToast(errorMessage, 4000);

    // Log detalhado do erro
    console.error("Login error:", error);
  }

  private getErrorMessage(error: any): string {
    if (error.name === "TimeoutError") {
      return "Tempo de conexão esgotado. Verifique sua internet.";
    }

    if (error.status === 401) {
      return "Usuário ou senha incorretos.";
    }

    if (error.status === 0) {
      return "Servidor offline. Tente novamente mais tarde.";
    }

    return error.error?.message || "Erro ao fazer login. Tente novamente.";
  }

  // ============== MÉTODOS DE ANIMAÇÃO ==============
  private initAnimations(): void {
    setTimeout(() => {
      this.logoState = "loaded";
      this.formState = "visible";
      this.titleState = "loaded";
    }, 100);
  }

  private triggerShakeAnimation(): void {
    this.shakeButton = true;
    setTimeout(() => {
      this.shakeButton = false;
    }, 1000);
  }

  private initParticles(): void {
    const canvas = this.particlesCanvas.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    // Criar partículas
    this.particles = [];
    const particleCount = Math.min(
      80,
      Math.floor((canvas.width * canvas.height) / 10000),
    );

    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: (Math.random() * canvas.width) / dpr,
        y: (Math.random() * canvas.height) / dpr,
        radius: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.4 + 0.1,
        color: `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.1})`,
      });
    }

    // Iniciar animação
    this.animateParticles();
  }

  private animateParticles(): void {
    const canvas = this.particlesCanvas.nativeElement;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    const animateFrame = () => {
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      this.particles.forEach((particle) => {
        // Atualizar posição
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Reaparecer nos limites com variação
        if (particle.x < -20) particle.x = canvas.width / dpr + 20;
        if (particle.x > canvas.width / dpr + 20) particle.x = -20;
        if (particle.y < -20) particle.y = canvas.height / dpr + 20;
        if (particle.y > canvas.height / dpr + 20) particle.y = -20;

        // Interação com mouse (se implementado)
        this.particles.forEach((otherParticle) => {
          if (particle !== otherParticle) {
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100) {
              ctx.beginPath();
              ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (1 - distance / 100)})`;
              ctx.lineWidth = 0.5;
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.stroke();
            }
          }
        });

        // Desenhar partícula
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
      });

      this.animationId = requestAnimationFrame(animateFrame);
    };

    this.animationId = requestAnimationFrame(animateFrame);
  }

  private startAmbientAnimations(): void {
    // Animação de cores dinâmicas no background
    let hue = 200;
    setInterval(() => {
      hue = (hue + 0.1) % 360;
      document.documentElement.style.setProperty(
        "--background",
        `linear-gradient(135deg, 
          hsl(${hue}, 70%, 60%) 0%, 
          hsl(${(hue + 40) % 360}, 70%, 50%) 50%,
          hsl(${(hue + 80) % 360}, 70%, 40%) 100%)`,
      );
    }, 50);
  }

  // ============== MÉTODOS AUXILIARES ==============
  private setupEventListeners(): void {
    window.addEventListener("resize", () => {
      if (this.particlesCanvas?.nativeElement) {
        const canvas = this.particlesCanvas.nativeElement;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
      }
    });

    // Detectar tecla Enter para login
    document.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Enter" && !this.isLoading) {
        this.login();
      }
    });
  }

  private checkConnection(): void {
    this.connectionStatus = navigator.onLine;

    window.addEventListener("online", () => {
      this.connectionStatus = true;
      this.showMessage("Conexão restaurada", "success");
    });

    window.addEventListener("offline", () => {
      this.connectionStatus = false;
      this.showMessage("Sem conexão com a internet", "error");
    });
  }

  private checkForUpdates(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe((event: VersionEvent) => {
        if (event.type === "VERSION_READY") {
          this.hasUpdate = true;
          this.dataLoad.atualizacaoDisponivel = true;
          this.mostrarToastAtualizacao();
        }
      });

      // Verificar atualizações periodicamente
      const intervalSub = interval(300000).subscribe(() => {
        this.swUpdate.checkForUpdate();
      });
      this.subscriptions.add(intervalSub);
    }
  }

  private setupPWA(): void {
    window.addEventListener("appinstalled", () => {
      this.deferredPrompt = null;
      this.isStandaloneMode = true;
      this.showMessage("App instalado com sucesso!", "success");
    });
  }

  private cleanup(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.subscriptions.unsubscribe();
  }

  // ============== MÉTODOS PÚBLICOS ==============
  showMessage(text: string, type: "success" | "error" | "info") {
    this.loginMessage = { text, type };
    setTimeout(() => {
      this.loginMessage = null;
    }, 4000);
  }

  getPasswordStrength(): number {
    if (!this.senha) return 0;

    let strength = 0;
    if (this.senha.length >= 6) strength += 25;
    if (this.senha.length >= 8) strength += 25;
    if (/[A-Z]/.test(this.senha)) strength += 25;
    if (/[0-9]/.test(this.senha)) strength += 25;

    return Math.min(strength, 100);
  }

  async mostrarToastAtualizacao() {
    const toast = await this.toastController.create({
      message: "🎉 Nova versão disponível!",
      duration: 5000,
      position: "top",
      cssClass: "update-toast",
      icon: "cloud-download-outline",
      mode: "ios",
      animated: true,
      buttons: [
        {
          side: "end",
          text: "Atualizar",
          role: "update",
          handler: () => {
            this.forcarAtualizacao();
          },
        },
      ],
    });

    await toast.present();
  }

  installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === "accepted") {
          this.showMessage("Instalando aplicativo...", "info");
        } else {
          this.showMessage("Instalação cancelada", "info");
        }
        this.deferredPrompt = null;
      });
    }
  }

  checkStandaloneMode(): boolean {
    // Verificar para iOS
    if ("standalone" in window.navigator && window.navigator["standalone"]) {
      return true;
    }

    // Verificar para Android/Web
    const isStandalone = matchMedia("(display-mode: standalone)").matches;
    return isStandalone;
  }

  goToHome(schema: string) {
    this.router.navigate(["/home"], {
      queryParams: {
        schema: schema,
        timestamp: Date.now(), // Evitar cache
      },
    });
  }

  async forcarAtualizacao() {
    try {
      await this.swUpdate.activateUpdate();
      document.location.reload();
    } catch (error) {
      this.alert.presentAlert(
        "ATENÇÃO",
        "Atualização",
        "Erro ao atualizar: " + error,
      );
    }
  }

  async showLoading(message: string, duration: number) {
    const loading = await this.loadingCtrl.create({
      message: message,
      duration: duration,
      spinner: "crescent",
      cssClass: "custom-loading",
    });
    await loading.present();
  }

  // ============== MÉTODOS DE UI ==============
  onLogoLoaded() {
    this.logoState = "loaded";
  }

  onUsernameFocus(focused: boolean) {
    this.usernameFocused = focused;
  }

  onPasswordFocus(focused: boolean) {
    this.passwordFocused = focused;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  // Método para controlar erro de carregamento da logo
  onLogoError(event: Event) {
    this.logoLoaded = false;
  }

  // Método para login por teclado
  onKeyPress(event: KeyboardEvent) {
    if (event.key === "Enter" && !this.isLoading) {
      this.login();
    }
  }

  // Método para limpar formulário
  clearForm() {
    this.user.nom_usuario = "";
    this.senha = "";
    this.lembrarSenha = false;

    // Limpar dados salvos do localStorage
    window.localStorage.removeItem("lembrarSenha");
    window.localStorage.removeItem("usuarioSalvo");
    window.localStorage.removeItem("senhaSalva");

    this.showMessage("Formulário limpo", "info");
  }
}
