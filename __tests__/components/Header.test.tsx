import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Header } from '@/components/Header';
import { PROGRAMM_COUNT_LABEL } from '@/lib/programm-count';

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Header Komponente', () => {
  beforeEach(() => {
    // Mock window.scrollY
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 0,
    });
  });

  it('sollte die Crest-Wortmarke mit Startseiten-Link rendern', () => {
    render(<Header />);
    // Logo = Crest "Ef" + Serif-Wortmarke (Richtung F), kein Bild mehr
    const logoLink = screen.getByLabelText('EduFunds - Zur Startseite');
    expect(logoLink).toBeInTheDocument();
    expect(logoLink).toHaveTextContent('Ef');
    expect(logoLink).toHaveTextContent('Edu');
    expect(logoLink).toHaveTextContent('Funds');
  });

  it('sollte den "Inhalt überspringen" Skip-Link rendern', () => {
    render(<Header />);
    const skipLink = screen.getByText('Inhalt überspringen');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('sollte die Hauptnavigation mit allen Links rendern', () => {
    render(<Header />);

    expect(screen.getByText('Förderprogramme')).toBeInTheDocument();
    expect(screen.getByText('Preise')).toBeInTheDocument();
    expect(screen.getByText('Über uns')).toBeInTheDocument();
    expect(screen.getByText('Kontakt')).toBeInTheDocument();
  });

  it('sollte das Programm-Anzahl-Badge bei Förderprogramme anzeigen', () => {
    render(<Header />);
    expect(screen.getByText(PROGRAMM_COUNT_LABEL)).toBeInTheDocument();
  });

  it('sollte den CTA-Button rendern', () => {
    render(<Header />);

    expect(screen.getByText('Programme entdecken')).toBeInTheDocument();
  });

  it('sollte die Mobile-Menu-Button haben', () => {
    render(<Header />);
    const menuButton = screen.getByLabelText('Menü öffnen');
    expect(menuButton).toBeInTheDocument();
  });

  it('sollte das Mobile-Menü öffnen wenn der Button geklickt wird', () => {
    render(<Header />);

    const menuButton = screen.getByLabelText('Menü öffnen');
    fireEvent.click(menuButton);

    // Nach dem Öffnen sollte der Schließen-Button sichtbar sein
    expect(screen.getByLabelText('Menü schließen')).toBeInTheDocument();
  });

  it('sollte alle Navigationslinks im Mobile-Menü anzeigen', () => {
    render(<Header />);

    const menuButton = screen.getByLabelText('Menü öffnen');
    fireEvent.click(menuButton);

    expect(screen.getAllByText('Förderprogramme').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Preise').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Über uns').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kontakt').length).toBeGreaterThan(0);
  });

  it('sollte das Mobile-Menü schließen wenn der Schließen-Button geklickt wird', async () => {
    render(<Header />);

    // Menü öffnen
    const openButton = screen.getByLabelText('Menü öffnen');
    fireEvent.click(openButton);

    // Menü schließen
    const closeButton = screen.getByLabelText('Menü schließen');
    fireEvent.click(closeButton);

    // Warten auf Animation/State-Update
    await waitFor(() => {
      expect(screen.queryByLabelText('Menü schließen')).not.toBeInTheDocument();
    });
  });

  it('sollte den Header mit korrekten ARIA-Attributen rendern', () => {
    render(<Header />);

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();

    const navigation = screen.getByRole('navigation');
    expect(navigation).toHaveAttribute('aria-label', 'Hauptnavigation');
  });

  it('sollte Links mit korrekten href-Attributen haben', () => {
    render(<Header />);

    const foerderprogrammeLink = screen.getByText('Förderprogramme').closest('a');
    expect(foerderprogrammeLink).toHaveAttribute('href', '/foerderprogramme');

    const preiseLink = screen.getByText('Preise').closest('a');
    expect(preiseLink).toHaveAttribute('href', '/preise');
  });

  it('sollte den Logo-Link zur Startseite haben', () => {
    render(<Header />);

    const logoLink = screen.getByLabelText('EduFunds - Zur Startseite');
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('sollte den Scroll-Progress-Bar rendern', () => {
    render(<Header />);

    // Die Progress-Bar sollte ein div mit width-Style sein
    const progressBar = document.querySelector('.h-full.bg-gradient-to-r');
    expect(progressBar).toBeInTheDocument();
  });

  it('sollte den Header sticky positioniert haben', () => {
    render(<Header />);

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('sticky', 'top-0');
  });
});
