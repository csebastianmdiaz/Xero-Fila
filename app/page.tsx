import Image from "next/image";
export default function Home() {
  return (
    // min-h-screen para que ocupe toda la altura y bg-brand-dark para el fondo
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-cream p-24">
      
      <div className="text-center">
        <div className="relative mb-8">
          <Image 
            src="/XFLogo.png"
            alt="Logo XeroFila"
            width={500}
            height={200}
            priority // Esto hace que cargue de inmediato
          />
        </div>
        
        <p className="text-brand-dark text-xl mt-4 max-w-lg mx-auto">
          Cero filas, estómago satisfecho!
        </p>

        {/*Botones simples*/}
        <div className="flex gap-4 justify-center mt-8">
          <button className="px-6 py-3 rounded-lg bg-brand-blue text-white font-semibold hover:opacity-90 transition">
            Prueba1
          </button>
          
          <button className="px-6 py-3 rounded-lg border-2 border-brand-green text-brand-green font-semibold hover:bg-brand-green hover:text-brand-dark transition">
            Prueba2
          </button>
        </div>
      </div>

      <div className="w-full relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="relative mx-auto overflow-hidden rounded-lg">
            <Image
            src="/poppy.jpg"
            alt="Prueba zoom-in"
            width={500}
            height={200}
            className="w-full h-auto relative z-0 rounded-lg transition-all duration-300 hover:scale-110"
            priority
          />
          </div>
        </div>
      </div>

    </main>
  );
}