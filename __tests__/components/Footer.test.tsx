import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Footer } from '@/components/Footer';
import { PROGRAMM_COUNT_LABEL } from '@/lib/programm-count';

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('Footer Komponente', () => {
  it('sollte das Logo als Bild mit alt-Text rendern', () => {
    render(<Footer />);
    const logo = screen.getByAltText('EduFunds');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/edufunds-logo.svg');
  });

  it('sollte die Statistiken rendern', () => {
    render(<Footer />);

    expect(screen.getByText(PROGRAMM_COUNT_LABEL)).toBeInTheDocument();
    expect(screen.getByText('DSGVO')).toBeInTheDocument();
    expect(screen.getByText('Kein')).toBeInTheDocument();

    // "Förderprogramme" kommt mehrfach vor (Stats + Produkt-Spalte)
    expect(screen.getAllByText('Förderprogramme').length).toBeGreaterThan(0);
    expect(screen.getByText('EU-Datenschutz')).toBeInTheDocument();
    expect(screen.getByText('Abo')).toBeInTheDocument();
  });

  it('sollte die Produkt-Links rendern', () => {
    render(<Footer />);

    expect(screen.getByText('Produkt')).toBeInTheDocument();
    expect(screen.getAllByText('Förderprogramme').length).toBeGreaterThan(0);
    expect(screen.getByText('KI-Antragsassistent')).toBeInTheDocument();
    expect(screen.getByText('Archiv')).toBeInTheDocument();
    // "Preise" kommt sowohl in der Produkt-Spalte vor
    expect(screen.getAllByText('Preise').length).toBeGreaterThan(0);
  });

  it('sollte die Unternehmen-Links rendern', () => {
    render(<Footer />);

    expect(screen.getByText('Unternehmen')).toBeInTheDocument();
    expect(screen.getByText('Über uns')).toBeInTheDocument();
    expect(screen.getByText('Kontakt')).toBeInTheDocument();
  });

  it('sollte die Rechts-Links rendern', () => {
    render(<Footer />);

    expect(screen.getByText('Rechtliches')).toBeInTheDocument();
    expect(screen.getByText('Impressum')).toBeInTheDocument();
    expect(screen.getByText('Datenschutz')).toBeInTheDocument();
    expect(screen.getByText('AGB')).toBeInTheDocument();
  });

  it('sollte die Beschreibung rendern', () => {
    render(<Footer />);

    expect(screen.getByText(/Die intelligente Plattform für Schulförderung/)).toBeInTheDocument();
  });

  it('sollte die Kontakt-E-Mail rendern', () => {
    render(<Footer />);

    const emailLink = screen.getByText('office@edufunds.org');
    expect(emailLink).toBeInTheDocument();
    expect(emailLink.closest('a')).toHaveAttribute('href', 'mailto:office@edufunds.org');
  });

  it('sollte den Standort rendern', () => {
    render(<Footer />);
    expect(screen.getByText('Berlin, Deutschland')).toBeInTheDocument();
  });

  it('sollte Social-Media-Links rendern', () => {
    render(<Footer />);

    expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
    expect(screen.getByLabelText('LinkedIn')).toBeInTheDocument();
  });

  it('sollte den Newsletter-Bereich rendern', () => {
    render(<Footer />);

    expect(screen.getByText('Newsletter abonnieren')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ihre@email.de')).toBeInTheDocument();
    expect(screen.getByText('Abonnieren')).toBeInTheDocument();
  });

  it('sollte Newsletter-Abonnement ermöglichen', async () => {
    // global.fetch (in test/setup.tsx gemockt) fuer diesen Test mit Erfolg ueberschreiben
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ success: true, message: 'Bitte bestätigen Sie Ihre Anmeldung.' }),
      } as unknown as Response);

    render(<Footer />);

    const emailInput = screen.getByPlaceholderText('ihre@email.de');
    const submitButton = screen.getByText('Abonnieren');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Fast geschafft!')).toBeInTheDocument();
    });

    fetchSpy.mockRestore();
  });

  it('sollte E-Mail-Validierung haben', () => {
    render(<Footer />);

    const emailInput = screen.getByPlaceholderText('ihre@email.de');
    expect(emailInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('sollte den Footer-Text mit Jahr rendern', () => {
    render(<Footer />);

    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument();
  });

  it('sollte den aitema-GmbH-Link haben', () => {
    render(<Footer />);

    const aitemaLink = screen.getByText('aitema GmbH');
    expect(aitemaLink).toHaveAttribute('href', 'https://aitema.de');
    expect(aitemaLink).toHaveAttribute('target', '_blank');
  });

  it('sollte "Made with love in Berlin" rendern', () => {
    render(<Footer />);

    expect(screen.getByText('Made with')).toBeInTheDocument();
    expect(screen.getByText('in Berlin')).toBeInTheDocument();
  });

  it('sollte den Footer als semantisches Element rendern', () => {
    render(<Footer />);

    const footer = document.querySelector('footer');
    expect(footer).toBeInTheDocument();
  });

  it('sollte alle Links korrekte href-Attribute haben', () => {
    render(<Footer />);

    // Produkt-Links
    const foerderLinks = screen
      .getAllByText('Förderprogramme')
      .map((el) => el.closest('a'))
      .filter((a): a is HTMLAnchorElement => a !== null);
    expect(foerderLinks.some((a) => a.getAttribute('href') === '/foerderprogramme')).toBe(true);

    expect(screen.getByText('KI-Antragsassistent').closest('a')).toHaveAttribute('href', '/#ki-assistent');
    expect(screen.getByText('Archiv').closest('a')).toHaveAttribute('href', '/archiv');

    const preiseLinks = screen
      .getAllByText('Preise')
      .map((el) => el.closest('a'))
      .filter((a): a is HTMLAnchorElement => a !== null);
    expect(preiseLinks.some((a) => a.getAttribute('href') === '/preise')).toBe(true);

    // Rechts-Links
    expect(screen.getByText('Impressum').closest('a')).toHaveAttribute('href', '/impressum');
    expect(screen.getByText('Datenschutz').closest('a')).toHaveAttribute('href', '/datenschutz');
    expect(screen.getByText('AGB').closest('a')).toHaveAttribute('href', '/agb');
  });

  it('sollte den Hinweis zum Newsletter zeigen', () => {
    render(<Footer />);

    expect(
      screen.getByText('Kein Spam, jederzeit abmeldbar. Wir respektieren Ihre Privatsphäre.')
    ).toBeInTheDocument();
  });
});
