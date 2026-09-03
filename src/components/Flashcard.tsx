import * as React from 'react';
import { CSSProperties, useRef, useState } from 'react';
import {
  iNaturalistApi,
  Place,
  SpeciesCount,
  speciesRankLevel,
  SpeciesFilters,
  Taxon,
} from '../inaturalist';
import Flicking from '@egjs/react-flicking';
import { Plugin } from '@egjs/react-flicking';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import { ButtonGroup, Col, Container, Navbar, Row, Toast, ToastContainer } from 'react-bootstrap';
import { Fade } from '@egjs/flicking-plugins';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpCircle,
  EyeFill,
  HandThumbsUp,
  HandThumbsDown,
  XCircle,
} from 'react-bootstrap-icons';
import { FlashcardData, FlashcardImage } from '../flashcard-data';
import { higherRankTaxonOf } from '../flashcard-manager';
import { HyperlinkButton } from './HyperlinkButton';
import { FlashcardRating } from '../flashcard-rating';
import '@egjs/flicking/dist/flicking.css';

const FlashcardPreviousImageButton = ({
  disabled,
  onClick,
  style,
}: {
  disabled: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}) => {
  return (
    <Button disabled={disabled} variant="outline-secondary" onClick={onClick} style={style}>
      <ArrowLeft />
      &nbsp; Prev. image
    </Button>
  );
};

const FlashcardNextImageButton = ({
  disabled,
  onClick,
  style,
}: {
  disabled: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}) => {
  return (
    <Button disabled={disabled} variant="outline-secondary" onClick={onClick} style={style}>
      Next image &nbsp;
      <ArrowRight />
    </Button>
  );
};

// Reshaping the deck: dropping this taxon, or trading it for the taxon above it.
const FlashcardDeckButtons = ({
  higherRankTaxon,
  removeDisabled,
  disabled,
  onRemove,
  onRaiseRank,
}: {
  higherRankTaxon?: Taxon;
  removeDisabled: boolean;
  disabled: boolean;
  onRemove: () => void;
  onRaiseRank: () => void;
}) => {
  return (
    <Row className="w-100 mb-2">
      <Col xs={6} className="d-grid">
        <Button
          size="sm"
          variant="outline-secondary"
          disabled={disabled || removeDisabled}
          onClick={onRemove}
        >
          <XCircle />
          &nbsp;Remove
        </Button>
      </Col>
      <Col xs={6} className="d-grid">
        <Button
          size="sm"
          variant="outline-secondary"
          disabled={disabled || !higherRankTaxon}
          onClick={onRaiseRank}
        >
          <ArrowUpCircle />
          &nbsp;Test {higherRankTaxon ? higherRankTaxon.rank : 'higher rank'} instead
        </Button>
      </Col>
    </Row>
  );
};

const FlashcardButtons = ({
  revealed,
  onPrevClick,
  onNextClick,
  onReveal,
  onRateClick,
  disabled,
  nextPrevDisabled,
  deckButtons,
}: {
  revealed: boolean;
  onPrevClick?: () => void;
  onNextClick?: () => void;
  onReveal?: () => void;
  onRateClick?: (rating: FlashcardRating) => void;
  disabled?: boolean;
  nextPrevDisabled?: boolean;
  deckButtons: React.JSX.Element;
}) => {
  let middle;
  if (revealed) {
    middle = (
      <>
        <Button
          style={{ width: '50%' }}
          variant="danger"
          disabled={disabled}
          onClick={() => onRateClick && onRateClick('dontknow')}
        >
          <>
            <HandThumbsDown /> Didn’t know it
          </>
        </Button>
        <Button
          style={{ width: '50%' }}
          variant="success"
          disabled={disabled}
          onClick={() => onRateClick && onRateClick('know')}
        >
          <>
            <HandThumbsUp /> Knew it
          </>
        </Button>
      </>
    );
  } else {
    middle = (
      <Button disabled={disabled} onClick={onReveal}>
        <>
          <EyeFill />
          &nbsp;Reveal
        </>
      </Button>
    );
  }
  const nextPrevButtonsDisabled = !!disabled || !!nextPrevDisabled;
  return (
    <Container>
      {deckButtons}
      <Row className="d-lg-none w-100">
        <Col xs={12} className="d-grid">
          <ButtonGroup>
            <FlashcardPreviousImageButton
              style={{ width: '50%' }}
              disabled={nextPrevButtonsDisabled}
              onClick={onPrevClick}
            />
            <FlashcardNextImageButton
              style={{ width: '50%' }}
              disabled={nextPrevButtonsDisabled}
              onClick={onNextClick}
            />
          </ButtonGroup>
        </Col>
      </Row>
      <Row className="w-100">
        <Col lg={3} xl={2} className="d-none d-lg-grid">
          <FlashcardPreviousImageButton disabled={nextPrevButtonsDisabled} onClick={onPrevClick} />
        </Col>
        <Col lg={6} xl={{ span: 6, offset: 1 }} className="d-grid">
          <ButtonGroup>{middle}</ButtonGroup>
        </Col>
        <Col lg={3} xl={{ span: 2, offset: 1 }} className="d-none d-lg-grid">
          <FlashcardNextImageButton disabled={nextPrevButtonsDisabled} onClick={onNextClick} />
        </Col>
      </Row>
    </Container>
  );
};

export const Flashcard = ({
  offlineMode,
  revealed,
  data,
  place,
  filters,
  notice,
  removeDisabled,
  onReveal,
  onRateClick,
  onRemove,
  onRaiseRank,
  onDismissNotice,
  onLoadImageMetadata,
  onLoadAncestors,
}: {
  offlineMode: boolean;
  revealed: boolean;
  data: FlashcardData;
  place: Place;
  filters: SpeciesFilters;
  notice?: string;
  removeDisabled: boolean;
  onReveal: () => void;
  onRateClick: (rating: FlashcardRating) => void;
  onRemove: () => void;
  onRaiseRank: () => void;
  onDismissNotice: () => void;
  onLoadImageMetadata: (images: FlashcardImage[]) => void;
  onLoadAncestors: (taxon: Taxon[]) => void;
}) => {
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const flickingRef = useRef<Flicking>(null);

  let inner: React.JSX.Element;
  let speciesFacts;

  if (data.images.length === 0) {
    loadImageMetadata(offlineMode, data.species, place, filters).then((flashcardImages) => {
      onLoadImageMetadata(flashcardImages);
    });

    inner = <p style={{ height: FLASHCARD_IMAGE_HEIGHT, margin: 0 }}>Loading images...</p>;
  } else if (data.ancestors === undefined) {
    iNaturalistApi.fetchAncestorTaxa(data.species.taxon).then(onLoadAncestors);
    inner = <p style={{ height: FLASHCARD_IMAGE_HEIGHT, margin: 0 }}>Loading ancestors...</p>;
  } else {
    const imageElems = data.images.map((image, i) => {
      const width = (image.width * FLASHCARD_IMAGE_HEIGHT) / image.height;
      return (
        <div style={{ position: 'relative' }} key={i}>
          <img
            width={width}
            height={FLASHCARD_IMAGE_HEIGHT}
            style={{ pointerEvents: 'none', marginRight: '5px', marginLeft: '5px' }}
            src={image.src}
            alt=""
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '4px',
              fontSize: '7px',
              padding: '2px 4px',
              background: 'rgba(0, 0, 0, 50%)',
              color: 'white',
              transform: 'translate(-50%, 0)',
              whiteSpace: 'nowrap',
            }}
          >
            {image.attribution}
          </div>
        </div>
      );
    });

    const flickingPlugins: Plugin[] = [new Fade()];

    // Without this, seeing the same flashcard images again would have misaligned images for some reason
    if (!isMoving) {
      flickingRef.current?.resize();
    }

    inner = (
      <Flicking
        onMoveStart={() => {
          setIsMoving(true);
        }}
        onMoveEnd={() => {
          setIsMoving(false);
        }}
        circular={true}
        ref={flickingRef}
        plugins={flickingPlugins}
      >
        {imageElems}
      </Flicking>
    );

    speciesFacts = revealed ? (
      <SpeciesFacts species={data.species} ancestors={data.ancestors} />
    ) : null;
  }

  return (
    <>
      <div className="d-grid gap-3 py-4" style={{ backgroundColor: 'white', position: 'relative' }}>
        {inner}
        {speciesFacts}
      </div>
      <ToastContainer position="top-center" className="p-3" style={{ zIndex: 20 }}>
        <Toast show={notice !== undefined} onClose={onDismissNotice} delay={6000} autohide>
          <Toast.Header>
            <strong className="me-auto">Back in play</strong>
          </Toast.Header>
          <Toast.Body>{notice}</Toast.Body>
        </Toast>
      </ToastContainer>
      <Navbar variant="light" bg="light" className="border-top" expand={false}>
        <FlashcardButtons
          revealed={revealed}
          disabled={data.images.length === 0}
          onPrevClick={() => flickingRef.current?.prev()}
          onNextClick={() => flickingRef.current?.next()}
          onRateClick={(rating: FlashcardRating) => onRateClick(rating)}
          onReveal={onReveal}
          nextPrevDisabled={isMoving}
          deckButtons={
            <FlashcardDeckButtons
              higherRankTaxon={higherRankTaxonOf(data)}
              removeDisabled={removeDisabled}
              disabled={data.images.length === 0}
              onRemove={onRemove}
              onRaiseRank={onRaiseRank}
            />
          }
        />
      </Navbar>
    </>
  );
};

// How many of a coarser taxon's members to show a photo of.
const memberPhotoCount = 12;

const loadImageMetadata: (
  offlineMode: boolean,
  species: SpeciesCount,
  place: Place,
  filters: SpeciesFilters,
) => Promise<FlashcardImage[]> = (offlineMode, species, place, filters) => {
  const promises = [loadTaxonDefaultPhoto(species.taxon)];
  if (!offlineMode) {
    // Recent observations of a genus are dominated by its commonest species, so
    // a taxon above species level is shown by one photo per member instead.
    promises.push(
      species.taxon.rank_level > speciesRankLevel
        ? loadMemberFlashcardImages(species.taxon, place, filters)
        : loadINaturalistObservationFlashcardImages(species),
    );
  }
  return Promise.all(promises).then((result) => {
    return Array.prototype.concat.apply([], result);
  });
};

const loadTaxonDefaultPhoto: (taxon: Taxon) => Promise<FlashcardImage[]> = (taxon) => {
  if (!taxon.default_photo) {
    return Promise.resolve([]);
  }
  const originalPhotoUrl = taxon.default_photo.medium_url.replace('medium', 'original');
  return loadFlashcardImage(originalPhotoUrl, taxon.default_photo.attribution);
};

// One photo per member species, so a genus card shows the whole genus rather
// than a dozen pictures of its commonest member.
const loadMemberFlashcardImages: (
  taxon: Taxon,
  place: Place,
  filters: SpeciesFilters,
) => Promise<FlashcardImage[]> = (taxon, place, filters) => {
  return iNaturalistApi
    .fetchAllSpeciesForPlace(undefined, place, { ...filters, taxon_id: taxon.id })
    .then((members) =>
      Promise.all(
        members.slice(0, memberPhotoCount).map((member) => loadTaxonDefaultPhoto(member.taxon)),
      ),
    )
    .then((memberImages) => memberImages.flat());
};

const loadFlashcardImage: (imageSrc: string, attribution: string) => Promise<FlashcardImage[]> = (
  imageSrc,
  attribution,
) => {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      resolve([
        {
          src: imageSrc,
          width: image.width,
          height: image.height,
          attribution,
        },
      ]);
    };
    image.src = imageSrc;
  });
};

const loadINaturalistObservationFlashcardImages: (
  species: SpeciesCount,
) => Promise<FlashcardImage[]> = (species) => {
  return iNaturalistApi.fetchObservationsForTaxon(species.taxon.id).then((results) => {
    const extraImages: FlashcardImage[] = [];
    for (const result of results) {
      // e.g. https://inaturalist-open-data.s3.amazonaws.com/photos/109982257/square.jpg?1610506716
      const squarePhotoUrl: string = result.photos[0].url;
      // e.g. https://inaturalist-open-data.s3.amazonaws.com/photos/109982257/original.jpg?1610506716
      const originalPhotoUrl = squarePhotoUrl.replace('square', 'original');
      extraImages.push({
        src: originalPhotoUrl,
        height: result.photos[0].original_dimensions.height,
        width: result.photos[0].original_dimensions.width,
        attribution: result.photos[0].attribution,
      });
    }
    return extraImages;
  });
};

const SpeciesFacts = ({ species, ancestors }: { species: SpeciesCount; ancestors: Taxon[] }) => {
  return (
    <Card
      style={{
        position: 'absolute',
        zIndex: ' 10',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxHeight: '20rem',
        overflowY: 'scroll',
        top: '50%',
      }}
    >
      <Card.Body>
        <Row>
          <Col>
            <div className="d-grid gap-3">
              <SpeciesName species={species} />
              <Hyperlinks species={species} />
            </div>
          </Col>
          <Col>
            <TaxonAncestors ancestors={ancestors} />
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

const taxonUrl = (id: number) => `https://www.inaturalist.org/taxa/${id}`;

const TaxonAncestors = ({ ancestors }: { ancestors: Taxon[] }) => {
  const rows = ancestors.map((ancestorTaxon, i) => {
    const commonName =
      ancestorTaxon.preferred_common_name && `(${ancestorTaxon.preferred_common_name})`;
    return (
      <li key={i}>
        <a href={taxonUrl(ancestorTaxon.id)} target="_blank" rel="noreferrer">
          <small>
            {ancestorTaxon.name} {commonName}
            <br />
            {ancestorTaxon.rank}
          </small>
        </a>
      </li>
    );
  });
  return <ul>{rows}</ul>;
};

const SpeciesName = ({ species }: { species: SpeciesCount }) => {
  const taxonName = <em>{capitalizeFirstLetter(species.taxon.name)}</em>;
  if (species.taxon.preferred_common_name) {
    return (
      <>
        <div>{capitalizeFirstLetter(species.taxon.preferred_common_name)}</div>
        <div className="text-secondary">({taxonName})</div>
      </>
    );
  } else {
    return (
      <>
        <div>{taxonName}</div>
      </>
    );
  }
};

const FLASHCARD_IMAGE_HEIGHT = 400;

const Hyperlinks = ({ species }: { species: SpeciesCount }) => {
  const iNaturalistUrl = `https://www.inaturalist.org/taxa/${species.taxon.id}`;
  const iNaturalistAnchor = <HyperlinkButton href={iNaturalistUrl}>iNaturalist</HyperlinkButton>;

  const wikipediaUrl = species.taxon.wikipedia_url;
  const wikipediaAnchor = wikipediaUrl && (
    <HyperlinkButton href={wikipediaUrl}>Wikipedia</HyperlinkButton>
  );

  return wikipediaAnchor ? (
    <div>
      {iNaturalistAnchor} {wikipediaAnchor}
    </div>
  ) : (
    <div>{iNaturalistAnchor}</div>
  );
};

const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};
