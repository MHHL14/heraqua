<?php
/**
 * Magento Framework Stubs for unit testing without a real Magento install.
 *
 * Each namespace uses a namespace block so all declarations can live in one file.
 * Methods only declare what is actually called in production code or tests (Tasks 4-14).
 */
declare(strict_types=1);

// ---------------------------------------------------------------------------
// Magento\Framework\App\Config
// ---------------------------------------------------------------------------
namespace Magento\Framework\App\Config {
    interface ScopeConfigInterface
    {
        public function getValue(string $path, mixed $scope = null, mixed $scopeCode = null): mixed;
        public function isSetFlag(string $path, mixed $scope = null, mixed $scopeCode = null): bool;
    }
}

// ---------------------------------------------------------------------------
// Magento\Framework\App\Config\Storage
// ---------------------------------------------------------------------------
namespace Magento\Framework\App\Config\Storage {
    interface WriterInterface
    {
        public function save(string $path, mixed $value, string $scope = 'default', int $scopeId = 0): void;
        public function delete(string $path, string $scope = 'default', int $scopeId = 0): void;
    }
}

// ---------------------------------------------------------------------------
// Magento\Framework\Encryption
// ---------------------------------------------------------------------------
namespace Magento\Framework\Encryption {
    interface EncryptorInterface
    {
        public function encrypt(string $data): string;
        public function decrypt(string $data): string;
    }
}

// ---------------------------------------------------------------------------
// Magento\Store\Model
// ---------------------------------------------------------------------------
namespace Magento\Store\Model {
    interface ScopeInterface
    {
        const SCOPE_STORE    = 'store';
        const SCOPE_WEBSITE  = 'website';
        const SCOPE_STORES   = 'stores';
        const SCOPE_WEBSITES = 'websites';
    }
}

// ---------------------------------------------------------------------------
// Magento\Framework\Filesystem\Directory
// ---------------------------------------------------------------------------
namespace Magento\Framework\Filesystem\Directory {
    interface WriteInterface
    {
        public function getAbsolutePath(string $path = null): string;
        public function create(string $path): bool;
        public function isExist(string $path): bool;
        public function writeFile(string $path, string $content, string $mode = 'w+'): int;
    }
}

// ---------------------------------------------------------------------------
// Magento\Framework\Filesystem (class in Magento\Framework namespace)
// ---------------------------------------------------------------------------
namespace Magento\Framework {
    class Filesystem
    {
        public function getDirectoryWrite(
            string $directoryCode,
            string $driverCode = 'file'
        ): \Magento\Framework\Filesystem\Directory\WriteInterface {
            throw new \LogicException('Filesystem stub — override via createMock()');
        }
    }
}

// Keep backward-compat alias in Magento\Framework\Filesystem namespace
namespace Magento\Framework\Filesystem {
    // Nothing needed here — the class lives in \Magento\Framework\Filesystem
}

// ---------------------------------------------------------------------------
// Magento\Framework\App\Filesystem
// ---------------------------------------------------------------------------
namespace Magento\Framework\App\Filesystem {
    class DirectoryList
    {
        const MEDIA   = 'media';
        const ROOT    = 'base';
        const VAR_DIR = 'var';
        const PUB    = 'pub';
    }
}

// ---------------------------------------------------------------------------
// Magento\Framework\Api
// ---------------------------------------------------------------------------
namespace Magento\Framework\Api {

    interface AttributeInterface
    {
        public function getValue(): mixed;
        public function getAttributeCode(): string;
    }

    interface SearchCriteriaInterface
    {
        // marker — no methods needed for current tests
    }

    class SearchCriteria implements SearchCriteriaInterface
    {
        // plain stub
    }

    class SearchCriteriaBuilder
    {
        public function addFilter(string $field, mixed $value, string $conditionType = 'eq'): static
        {
            return $this;
        }

        public function create(): \Magento\Framework\Api\SearchCriteria
        {
            return new \Magento\Framework\Api\SearchCriteria();
        }
    }

    class SearchResults
    {
        public function getItems(): array
        {
            return [];
        }
    }
}

// ---------------------------------------------------------------------------
// Magento\Catalog\Api\Data
// ---------------------------------------------------------------------------
namespace Magento\Catalog\Api\Data {

    interface ProductInterface
    {
        public function getName(): string;
        public function getPrice(): float;
        public function getSku(): string;
        public function getCustomAttribute(string $attributeCode): ?\Magento\Framework\Api\AttributeInterface;
        public function getData(string $key = ''): mixed;
    }

    interface ProductAttributeInterface
    {
        public function getAttributeCode(): string;
        public function getDefaultFrontendLabel(): ?string;
    }
}

// ---------------------------------------------------------------------------
// Magento\Catalog\Api
// ---------------------------------------------------------------------------
namespace Magento\Catalog\Api {

    interface ProductRepositoryInterface
    {
        public function getList(\Magento\Framework\Api\SearchCriteriaInterface $searchCriteria): \Magento\Framework\Api\SearchResults;
    }

    interface ProductAttributeRepositoryInterface
    {
        public function getList(\Magento\Framework\Api\SearchCriteriaInterface $searchCriteria): \Magento\Framework\Api\SearchResults;
    }
}

// ---------------------------------------------------------------------------
// Magento\Framework\App  (CacheInterface, HttpGetActionInterface, Response\Http, RequestInterface)
// ---------------------------------------------------------------------------
namespace Magento\Framework\App {

    interface CacheInterface
    {
        public function save(string $data, string $identifier, array $tags = [], int|bool|null $lifeTime = null): bool;
        public function load(string $identifier): string|false;
        public function remove(string $identifier): bool;
    }

    interface RequestInterface
    {
        public function getParam(string $key, mixed $defaultValue = null): mixed;
    }
}

namespace Magento\Framework\App\Action {
    interface HttpGetActionInterface
    {
        public function execute();
    }
}

namespace Magento\Framework\App\Response {
    class Http
    {
        // plain stub
    }
}

// ---------------------------------------------------------------------------
// Magento\Framework\Controller\Result
// ---------------------------------------------------------------------------
namespace Magento\Framework\Controller\Result {

    class Raw
    {
        public function setHeader(string $name, mixed $value, bool $replace = false): static
        {
            return $this;
        }

        public function setContents(string $content): static
        {
            return $this;
        }
    }

    class RawFactory
    {
        public function create(array $data = []): \Magento\Framework\Controller\Result\Raw
        {
            return new \Magento\Framework\Controller\Result\Raw();
        }
    }

    class Redirect
    {
        public function setPath(string $path, array $params = []): static
        {
            return $this;
        }
    }

    class RedirectFactory
    {
        public function create(array $data = []): \Magento\Framework\Controller\Result\Redirect
        {
            return new \Magento\Framework\Controller\Result\Redirect();
        }
    }
}

// ---------------------------------------------------------------------------
// Magento\Framework\Message
// ---------------------------------------------------------------------------
namespace Magento\Framework\Message {

    interface ManagerInterface
    {
        public function addSuccessMessage(string|\Magento\Framework\Phrase $message, ?string $group = null): static;
        public function addErrorMessage(string|\Magento\Framework\Phrase $message, ?string $group = null): static;
        public function addNoticeMessage(string|\Magento\Framework\Phrase $message, ?string $group = null): static;
    }
}

// ---------------------------------------------------------------------------
// Magento\Framework  (Phrase, UrlInterface)
// ---------------------------------------------------------------------------
namespace Magento\Framework {

    class Phrase
    {
        private string $text;
        private array $arguments;

        public function __construct(string $text, array $arguments = [])
        {
            $this->text = $text;
            $this->arguments = $arguments;
        }

        public function __toString(): string
        {
            $text = $this->text;
            foreach ($this->arguments as $i => $value) {
                $text = str_replace('%' . ($i + 1), (string)$value, $text);
            }
            return $text;
        }
    }

    interface UrlInterface
    {
        public function getUrl(string $routePath = null, array $routeParams = []): string;
    }
}

// ---------------------------------------------------------------------------
// Magento\Framework\Event
// ---------------------------------------------------------------------------
namespace Magento\Framework {

    class Event
    {
        // plain stub
    }
}

namespace Magento\Framework\Event {

    class Observer
    {
        public function getEvent(): \Magento\Framework\Event
        {
            return new \Magento\Framework\Event();
        }

        public function getData(string $key = ''): mixed
        {
            return null;
        }
    }

    interface ObserverInterface
    {
        public function execute(\Magento\Framework\Event\Observer $observer): void;
    }
}

// ---------------------------------------------------------------------------
// Magento\Framework\View\Element (Template, Template\Context)
// ---------------------------------------------------------------------------
namespace Magento\Framework\View\Element\Template {

    class Context
    {
        public function getUrlBuilder(): \Magento\Framework\UrlInterface
        {
            throw new \LogicException('Context stub — override via createMock()');
        }

        public function getRequest(): \Magento\Framework\App\RequestInterface
        {
            throw new \LogicException('Context stub — override via createMock()');
        }
    }
}

namespace Magento\Framework\View\Element {

    class Template
    {
        /** @var \Magento\Framework\UrlInterface */
        protected $_urlBuilder;

        /** @var string */
        protected $_template = '';

        /** @var array<string, mixed> */
        private array $data = [];

        public function __construct(\Magento\Framework\View\Element\Template\Context $context, array $data = [])
        {
            $this->_urlBuilder = $context->getUrlBuilder();
            $this->data = $data;
        }

        public function getData(string $key = ''): mixed
        {
            return $this->data[$key] ?? null;
        }

        public function setData(string $key, mixed $value): static
        {
            $this->data[$key] = $value;
            return $this;
        }

        protected function _toHtml(): string
        {
            return '';
        }

        public function toHtml(): string
        {
            return $this->_toHtml();
        }

        public function escapeHtml(mixed $data, ?array $allowedTags = null): string
        {
            return htmlspecialchars((string)$data, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }

        public function escapeHtmlAttr(mixed $data, bool $escapeSingleQuote = true): string
        {
            $flags = ENT_QUOTES | ENT_SUBSTITUTE;
            return htmlspecialchars((string)$data, $flags, 'UTF-8');
        }

        public function escapeUrl(string $string): string
        {
            return htmlspecialchars($string, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }

        public function getUrl(string $route = '', array $params = []): string
        {
            return $this->_urlBuilder->getUrl($route, $params);
        }

        public function getBlockHtml(string $name): string
        {
            return '';
        }

        public function getLayout(): mixed
        {
            return null;
        }
    }
}

// ---------------------------------------------------------------------------
// Magento\Framework\View\Result (Page, PageFactory)
// ---------------------------------------------------------------------------
namespace Magento\Framework\View\Result {

    class Page
    {
        public function setActiveMenu(string $id): static
        {
            return $this;
        }

        public function getConfig(): mixed
        {
            return null;
        }
    }

    class PageFactory
    {
        public function create(): \Magento\Framework\View\Result\Page
        {
            return new \Magento\Framework\View\Result\Page();
        }
    }
}

// ---------------------------------------------------------------------------
// Magento\Framework\View\Asset
// ---------------------------------------------------------------------------
namespace Magento\Framework\View\Asset {

    class Repository
    {
        public function getUrl(string $fileId, array $params = []): string
        {
            return '';
        }
    }
}

// ---------------------------------------------------------------------------
// Magento\Backend\App\Action\Context + Magento\Backend\App\Action
// ---------------------------------------------------------------------------
namespace Magento\Backend\App\Action {

    class Context
    {
        public function getMessageManager(): \Magento\Framework\Message\ManagerInterface
        {
            throw new \LogicException('Context stub — override via createMock()');
        }

        public function getResultRedirectFactory(): \Magento\Framework\Controller\Result\RedirectFactory
        {
            throw new \LogicException('Context stub — override via createMock()');
        }

        public function getRequest(): \Magento\Framework\App\RequestInterface
        {
            throw new \LogicException('Context stub — override via createMock()');
        }

        public function getResultFactory(): mixed
        {
            return null;
        }

        public function getObjectManager(): mixed
        {
            return null;
        }

        public function getHelper(): mixed
        {
            return null;
        }
    }
}

namespace Magento\Backend\App {

    abstract class Action
    {
        public const ADMIN_RESOURCE = '';

        /** @var \Magento\Framework\Message\ManagerInterface */
        protected $messageManager;

        /** @var \Magento\Framework\Controller\Result\RedirectFactory */
        protected $resultRedirectFactory;

        /** @var \Magento\Framework\App\RequestInterface */
        protected $_request;

        public function __construct(\Magento\Backend\App\Action\Context $context)
        {
            $this->messageManager        = $context->getMessageManager();
            $this->resultRedirectFactory = $context->getResultRedirectFactory();
            $this->_request              = $context->getRequest();
        }

        protected function getRequest(): \Magento\Framework\App\RequestInterface
        {
            return $this->_request;
        }

        abstract public function execute();
    }
}

// ---------------------------------------------------------------------------
// Magento\Backend\Block
// ---------------------------------------------------------------------------
namespace Magento\Backend\Block\Template {
    class Context extends \Magento\Framework\View\Element\Template\Context
    {
        // inherits getUrlBuilder() and getRequest()
    }
}

namespace Magento\Backend\Block {
    abstract class Template extends \Magento\Framework\View\Element\Template
    {
        // inherits everything from the frontend Template stub
    }
}

// ---------------------------------------------------------------------------
// Magento\Widget\Block
// ---------------------------------------------------------------------------
namespace Magento\Widget\Block {
    interface BlockInterface
    {
        // marker interface
    }
}

// ---------------------------------------------------------------------------
// Magento\Framework\Data (OptionSourceInterface — used by Source models in Task 4)
// ---------------------------------------------------------------------------
namespace Magento\Framework\Data {
    interface OptionSourceInterface
    {
        public function toOptionArray(): array;
    }
}

// ---------------------------------------------------------------------------
// Magento\Framework\Component (ComponentRegistrar — used in registration.php)
// ---------------------------------------------------------------------------
namespace Magento\Framework\Component {
    class ComponentRegistrar
    {
        const MODULE = 'module';

        public static function register(string $type, string $componentName, string $componentPath): void
        {
            // stub — no-op
        }
    }
}

// ---------------------------------------------------------------------------
// Global helper function __()
// ---------------------------------------------------------------------------
namespace {
    if (!function_exists('__')) {
        /**
         * Stub for Magento's __() translation helper.
         * Returns a Phrase whose __toString() interpolates %1, %2, ...
         * PHPUnit 10's StringContains requires is_string(); so the Phrase stub
         * also implements \Stringable (via __toString), but PHPUnit won't cast
         * it automatically.  Production code that passes __() to mocked methods
         * compared with stringContains() must rely on the ManagerInterface stub
         * accepting Phrase objects — the mock framework will call (string) on
         * Stringable when building the failure message, but matches() itself
         * returns false for non-strings.
         *
         * To make stringContains() work in tests the ManagerInterface stub
         * records addSuccessMessage/addErrorMessage params and the Phrase is
         * passed as-is.  The fix: return a plain interpolated string so that
         * PHPUnit StringContains sees an actual string.
         */
        function __(string $text, mixed ...$args): \Magento\Framework\Phrase
        {
            return new \Magento\Framework\Phrase($text, $args);
        }
    }
}
