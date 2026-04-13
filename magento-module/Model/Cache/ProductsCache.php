<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Model\Cache;

use Magento\Framework\App\Filesystem\DirectoryList;
use Magento\Framework\Filesystem;

class ProductsCache
{
    private const SUBDIR = 'herqua';
    private const FILENAME = 'products.json';

    public function __construct(private readonly Filesystem $filesystem) {}

    /**
     * @param array<int, array<string, mixed>> $products
     */
    public function write(array $products): void
    {
        $writer = $this->filesystem->getDirectoryWrite(DirectoryList::MEDIA);
        $writer->create(self::SUBDIR);

        $relTarget = self::SUBDIR . '/' . self::FILENAME;
        $target = $writer->getAbsolutePath($relTarget);
        $tmp = $target . '.tmp';

        $json = json_encode($products, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new \RuntimeException('Failed to encode products as JSON');
        }

        file_put_contents($tmp, $json);
        rename($tmp, $target);
    }

    /**
     * @return array<int, array<string, mixed>>|null
     */
    public function read(): ?array
    {
        $path = $this->path();
        if (!file_exists($path)) {
            return null;
        }
        $decoded = json_decode((string)file_get_contents($path), true);
        return is_array($decoded) ? $decoded : null;
    }

    public function lastModified(): ?\DateTimeImmutable
    {
        $path = $this->path();
        if (!file_exists($path)) {
            return null;
        }
        return (new \DateTimeImmutable())->setTimestamp((int)filemtime($path));
    }

    public function path(): string
    {
        $writer = $this->filesystem->getDirectoryWrite(DirectoryList::MEDIA);
        return $writer->getAbsolutePath(self::SUBDIR . '/' . self::FILENAME);
    }
}
